package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/cosmos/cosmos-sdk/server"
)

// ProofOfAuthorship captures a local proof entry for authored code.
type ProofOfAuthorship struct {
	CodeHash     string `json:"code_hash"`
	SignedBy     string `json:"signed_by"`
	Timestamp    int64  `json:"timestamp"`
	GitCommit    string `json:"git_commit"`
	VaultAddress string `json:"vault_address"`
}

// AuthorshipLedger stores persisted proofs on disk.
type AuthorshipLedger struct {
	Proofs []ProofOfAuthorship `json:"proofs"`
}

// SubmitProofOfAuthorship hashes code and appends proof details to the ledger.
func SubmitProofOfAuthorship(code []byte, signer string, commit string, vault string) error {
	hash := sha256.Sum256(code)
	hexHash := fmt.Sprintf("0x%s", hex.EncodeToString(hash[:]))
	entry := ProofOfAuthorship{
		CodeHash:     hexHash,
		SignedBy:     strings.ToLower(signer),
		Timestamp:    time.Now().Unix(),
		GitCommit:    commit,
		VaultAddress: strings.ToLower(vault),
	}
	ledger := LoadAuthorshipLedger()
	ledger.Proofs = append(ledger.Proofs, entry)
	return SaveAuthorshipLedger(ledger)
}

// LoadAuthorshipLedger loads proofs from disk if present.
func LoadAuthorshipLedger() AuthorshipLedger {
	var ledger AuthorshipLedger
	data, err := os.ReadFile("sip5_authorship.json")
	if err == nil {
		_ = json.Unmarshal(data, &ledger)
	}
	return ledger
}

// SaveAuthorshipLedger persists proof entries to disk.
func SaveAuthorshipLedger(ledger AuthorshipLedger) error {
	data, err := json.MarshalIndent(ledger, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("sip5_authorship.json", data, 0o644)
}

// VerifyCodeHash returns the matching proof for a given hash if one exists.
func VerifyCodeHash(hash string) *ProofOfAuthorship {
	ledger := LoadAuthorshipLedger()
	for i := range ledger.Proofs {
		if strings.EqualFold(ledger.Proofs[i].CodeHash, hash) {
			return &ledger.Proofs[i]
		}
	}
	return nil
}

// RuntimeWatchdog checks a list of contract hashes against the ledger.
func RuntimeWatchdog(contractHashes []string) {
	ledger := LoadAuthorshipLedger()
	hashMap := make(map[string]bool)
	for _, proof := range ledger.Proofs {
		hashMap[strings.ToLower(proof.CodeHash)] = true
	}
	for _, hash := range contractHashes {
		if !hashMap[strings.ToLower(hash)] {
			fmt.Printf("[⚠️] Unverified contract detected: %s\n", hash)
		} else {
			fmt.Printf("[✓] Verified: %s\n", hash)
		}
	}
}

// GenerateSIP5AnchoringProposal emits a proposal file for anchoring SIP-5 metadata.
func GenerateSIP5AnchoringProposal() {
	proposal := map[string]any{
		"title":       "SIP-5: Authorship Ledger + Runtime Watchdog",
		"description": "Enforces deployer authorship via code hash, git commit, and vault proof. SIP-5 anchors runtime verification against registry.",
		"file":        "sip5_authorship.json",
		"deposit":     "11000000usei",
	}
	res, err := json.MarshalIndent(proposal, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile("sip5_anchor_proposal.json", res, 0o644)
	fmt.Println("[✓] SIP-5 Proposal written: sip5_anchor_proposal.json")
}

// InitCodexSIP5 runs a local SIP-5 flow to seed proofs and check a sample hash.
func InitCodexSIP5(ctx context.Context, serverCtx *server.Context) {
	_ = ctx
	_ = serverCtx
	code := []byte("contract SoulSyncProof { function sync() public {} }")
	_ = SubmitProofOfAuthorship(code, "0xDeaDBeefCafe0000000000000000000000000000", "c1a2b3f", "0xVault000000000000000000000000000000000042")
	GenerateSIP5AnchoringProposal()
	hash := sha256.Sum256(code)
	hexHash := fmt.Sprintf("0x%s", hex.EncodeToString(hash[:]))
	proof := VerifyCodeHash(hexHash)
	if proof != nil {
		fmt.Printf("[✓] Verified Proof: %s by %s\n", proof.CodeHash, proof.SignedBy)
	} else {
		fmt.Println("[⚠️] No authorship found for submitted hash")
	}
	RuntimeWatchdog([]string{hexHash, "0xBADCODE1234567890ABCDEF"})
	fmt.Println("[✓] SIP-5 Proof of Authorship + Watchdog Active.")
}
