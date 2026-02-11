// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract OmegaGuardian {
    struct ProtectionContext {
        address requester;
        bytes32 entropy;
        bytes32 mirrorHash;
    }

    interface ICodexSigil {
        function ownerOf(uint256 sigilId) external view returns (address);
    }

    interface IVaultSigilLink {
        function vaultToSigil(uint256 vaultId) external view returns (uint256);
    }

    interface IOmegaGuardianRuleset {
        function isSignerAllowed(address signer) external view returns (bool);
    }

    interface IChainMirrorVerifier {
        function verifyForkHash(bytes32 mirrorHash) external view returns (bool);
    }

    interface IEntropyProofRecorder {
        function recordEntropy(bytes32 entropy, uint256 vaultId) external;
    }

    interface IGuardianCovenantLog {
        function logCovenant(
            uint256 vaultId,
            address signer,
            uint256 sigilId,
            bytes32 entropy,
            bytes32 mirrorHash
        ) external;
    }

    struct Seal {
        address author;
        bytes32 codeHash;
        bytes32 functionHash;
        uint256 timestamp;
        bytes32 merkleRoot;
        string uri;
    }

    mapping(bytes32 => Seal) public seals;
    mapping(address => bytes32[]) public authorSeals;
    mapping(uint256 => ProtectionContext) public protectionContexts;

    address public withdrawHook;
    ICodexSigil public sigil;
    IVaultSigilLink public vaultSigilLink;
    IOmegaGuardianRuleset public ruleset;
    IChainMirrorVerifier public chainMirrorVerifier;
    IEntropyProofRecorder public entropyRecorder;
    IGuardianCovenantLog public covenantLog;

    event SealCreated(
        bytes32 indexed sealId,
        address indexed author,
        bytes32 codeHash,
        bytes32 functionHash,
        uint256 timestamp,
        bytes32 merkleRoot,
        string uri
    );

    event WithdrawHookUpdated(address indexed withdrawHook);
    event ProtectionPrepared(
        uint256 indexed vaultId,
        address indexed requester,
        bytes32 entropy,
        bytes32 mirrorHash
    );
    event GuardianProtected(
        uint256 indexed vaultId,
        address indexed requester,
        uint256 indexed sigilId,
        bytes32 entropy,
        bytes32 mirrorHash
    );

    modifier onlyWithdrawHook() {
        require(msg.sender == withdrawHook, "Unauthorized hook");
        _;
    }

    constructor(
        address sigilAddr,
        address vaultSigilLinkAddr,
        address rulesetAddr,
        address mirrorVerifierAddr,
        address entropyRecorderAddr,
        address covenantLogAddr,
        address withdrawHookAddr
    ) {
        sigil = ICodexSigil(sigilAddr);
        vaultSigilLink = IVaultSigilLink(vaultSigilLinkAddr);
        ruleset = IOmegaGuardianRuleset(rulesetAddr);
        chainMirrorVerifier = IChainMirrorVerifier(mirrorVerifierAddr);
        entropyRecorder = IEntropyProofRecorder(entropyRecorderAddr);
        covenantLog = IGuardianCovenantLog(covenantLogAddr);
        withdrawHook = withdrawHookAddr;
    }

    function createSeal(
        bytes32 codeHash,
        bytes32 functionHash,
        bytes32 merkleRoot,
        string calldata uri
    ) external returns (bytes32 sealId) {
        sealId = keccak256(
            abi.encodePacked(
                msg.sender,
                codeHash,
                functionHash,
                block.timestamp,
                merkleRoot
            )
        );

        require(seals[sealId].timestamp == 0, "Seal already exists");

        seals[sealId] = Seal({
            author: msg.sender,
            codeHash: codeHash,
            functionHash: functionHash,
            timestamp: block.timestamp,
            merkleRoot: merkleRoot,
            uri: uri
        });

        authorSeals[msg.sender].push(sealId);

        emit SealCreated(
            sealId,
            msg.sender,
            codeHash,
            functionHash,
            block.timestamp,
            merkleRoot,
            uri
        );
    }

    function verifySeal(bytes32 sealId) external view returns (bool) {
        return seals[sealId].timestamp != 0;
    }

    function getAuthorSeals(address author)
        external
        view
        returns (bytes32[] memory)
    {
        return authorSeals[author];
    }

    function updateWithdrawHook(address withdrawHookAddr) external {
        withdrawHook = withdrawHookAddr;
        emit WithdrawHookUpdated(withdrawHookAddr);
    }

    function prepareProtection(
        uint256 vaultId,
        address requester,
        bytes32 entropy,
        bytes32 mirrorHash
    ) external onlyWithdrawHook {
        protectionContexts[vaultId] = ProtectionContext({
            requester: requester,
            entropy: entropy,
            mirrorHash: mirrorHash
        });

        emit ProtectionPrepared(vaultId, requester, entropy, mirrorHash);
    }

    function guardian_protect(uint256 vaultId)
        external
        onlyWithdrawHook
        returns (bool)
    {
        ProtectionContext memory context = protectionContexts[vaultId];
        require(context.requester != address(0), "Missing requester");
        require(ruleset.isSignerAllowed(context.requester), "Signer not sealed");

        uint256 sigilId = vaultSigilLink.vaultToSigil(vaultId);
        require(sigilId != 0, "Missing sigil link");
        require(sigil.ownerOf(sigilId) == context.requester, "Sigil mismatch");
        require(
            chainMirrorVerifier.verifyForkHash(context.mirrorHash),
            "Fork hash invalid"
        );

        entropyRecorder.recordEntropy(context.entropy, vaultId);
        covenantLog.logCovenant(
            vaultId,
            context.requester,
            sigilId,
            context.entropy,
            context.mirrorHash
        );

        emit GuardianProtected(
            vaultId,
            context.requester,
            sigilId,
            context.entropy,
            context.mirrorHash
        );

        delete protectionContexts[vaultId];
        return true;
    }
}
