// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

interface IOmegaGuardianProtect {
    function prepareProtection(
        uint256 vaultId,
        address requester,
        bytes32 entropy,
        bytes32 mirrorHash
    ) external;

    function guardian_protect(uint256 vaultId) external returns (bool);
}

interface ICodexSigilOwner {
    function ownerOf(uint256 sigilId) external view returns (address);
}

interface IVaultSigilLinkView {
    function vaultToSigil(uint256 vaultId) external view returns (uint256);
}

contract VaultWithdrawHook {
    address public admin;
    address public trustedWithdrawCaller;

    IOmegaGuardianProtect public guardian;
    ICodexSigilOwner public sigil;
    IVaultSigilLinkView public vaultSigilLink;

    struct ProtectionContext {
        bytes32 entropy;
        bytes32 mirrorHash;
    }

    mapping(uint256 => ProtectionContext) public protectionContexts;

    event ProtectionContextSet(
        uint256 indexed vaultId,
        bytes32 entropy,
        bytes32 mirrorHash
    );

    event TrustedWithdrawCallerUpdated(address indexed trustedWithdrawCaller);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    modifier onlyTrustedWithdrawCaller() {
        require(
            msg.sender == trustedWithdrawCaller,
            "Unauthorized withdraw caller"
        );
        _;
    }

    constructor(
        address adminAddr,
        address trustedWithdrawCallerAddr,
        address guardianAddr,
        address sigilAddr,
        address vaultSigilLinkAddr
    ) {
        admin = adminAddr;
        trustedWithdrawCaller = trustedWithdrawCallerAddr;
        guardian = IOmegaGuardianProtect(guardianAddr);
        sigil = ICodexSigilOwner(sigilAddr);
        vaultSigilLink = IVaultSigilLinkView(vaultSigilLinkAddr);
    }

    function updateTrustedWithdrawCaller(address trustedWithdrawCallerAddr)
        external
        onlyAdmin
    {
        trustedWithdrawCaller = trustedWithdrawCallerAddr;
        emit TrustedWithdrawCallerUpdated(trustedWithdrawCallerAddr);
    }

    function setProtectionContext(
        uint256 vaultId,
        bytes32 entropy,
        bytes32 mirrorHash
    ) external onlyAdmin {
        protectionContexts[vaultId] = ProtectionContext({
            entropy: entropy,
            mirrorHash: mirrorHash
        });

        emit ProtectionContextSet(vaultId, entropy, mirrorHash);
    }

    function onWithdraw(uint256 vaultId, address requester)
        external
        onlyTrustedWithdrawCaller
        returns (bool)
    {
        uint256 sigilId = vaultSigilLink.vaultToSigil(vaultId);
        require(sigilId != 0, "Missing sigil link");
        require(sigil.ownerOf(sigilId) == requester, "Sigil mismatch");

        ProtectionContext memory context = protectionContexts[vaultId];

        guardian.prepareProtection(
            vaultId,
            requester,
            context.entropy,
            context.mirrorHash
        );

        delete protectionContexts[vaultId];

        return guardian.guardian_protect(vaultId);
    }
}
