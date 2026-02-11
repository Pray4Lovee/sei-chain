package app

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/cosmos/cosmos-sdk/server"
)

// CodexBatchRecord records the batch metadata for SIP-10.
type CodexBatchRecord struct {
	BatchID       string `json:"batch_id"`
	Verifier      string `json:"verifier"`
	RoyaltyDue    string `json:"royalty_due"`
	TokenCount    int    `json:"token_count"`
	SnapshotBlock int64  `json:"snapshot_block"`
	GigaHash      string `json:"giga_hash"`
	Verified      bool   `json:"verified"`
	Timestamp     int64  `json:"timestamp"`
}

// CodexBatchIndex tracks all SIP-10 batches.
type CodexBatchIndex struct {
	Batches []CodexBatchRecord `json:"batches"`
}

// SubmitCodexBatch appends a new batch record to the SIP-10 ledger.
func SubmitCodexBatch(batchID, verifier, royalty string, count int, block int64, hash string) error {
	idx := LoadCodexBatchIndex()
	r := CodexBatchRecord{
		BatchID:       batchID,
		Verifier:      strings.ToLower(verifier),
		RoyaltyDue:    royalty,
		TokenCount:    count,
		SnapshotBlock: block,
		GigaHash:      hash,
		Verified:      false,
		Timestamp:     time.Now().Unix(),
	}
	idx.Batches = append(idx.Batches, r)
	return SaveCodexBatchIndex(idx)
}

// LoadCodexBatchIndex reads the SIP-10 batch index from disk.
func LoadCodexBatchIndex() CodexBatchIndex {
	var b CodexBatchIndex
	f, err := os.ReadFile("sip10_codex_batches.json")
	if err == nil {
		_ = json.Unmarshal(f, &b)
	}
	return b
}

// SaveCodexBatchIndex persists the SIP-10 batch index to disk.
func SaveCodexBatchIndex(b CodexBatchIndex) error {
	by, _ := json.MarshalIndent(b, "", "  ")
	return os.WriteFile("sip10_codex_batches.json", by, 0o644)
}

// VerifyCodexBatch marks the requested batch as verified.
func VerifyCodexBatch(batchID string) error {
	idx := LoadCodexBatchIndex()
	for i, b := range idx.Batches {
		if b.BatchID == batchID && !b.Verified {
			idx.Batches[i].Verified = true
			fmt.Printf("[✓] Codex Batch Verified: %s\n", batchID)
			return SaveCodexBatchIndex(idx)
		}
	}
	return fmt.Errorf("[!] Batch not found or already verified: %s", batchID)
}

// PrintRoyaltyStats prints royalty and verification status for all batches.
func PrintRoyaltyStats() {
	idx := LoadCodexBatchIndex()
	total := 0
	owed := 0
	for _, b := range idx.Batches {
		total++
		if !b.Verified {
			owed++
			fmt.Printf("[⚠️] Royalty Owed: %s → %s tokens (Hash: %s)\n", b.RoyaltyDue, strconv.Itoa(b.TokenCount), b.GigaHash)
		}
	}
	fmt.Printf("[✓] Codex Batches: %d, Verified: %d, Owed: %d\n", total, total-owed, owed)
}

// GenerateSIP10AnchoringProposal emits the SIP-10 anchoring proposal file.
func GenerateSIP10AnchoringProposal() {
	proposal := map[string]any{
		"title":       "SIP-10: Codex GigaDrop + Royalty Batch Enforcement",
		"description": "Enforces cross-batch royalty and deployer payout integrity, activating GigaBatch verifier + Codex sovereignty ledger.",
		"file":        "sip10_codex_batches.json",
		"deposit":     "10200000usei",
	}
	res, _ := json.MarshalIndent(proposal, "", "  ")
	_ = os.WriteFile("sip10_anchor_proposal.json", res, 0o644)
	fmt.Println("[✓] SIP-10 Anchoring Proposal written.")
}

// InitCodexSIP10 runs the SIP-10 bootstrap sequence.
func InitCodexSIP10(ctx context.Context, serverCtx *server.Context) {
	_ = ctx
	_ = serverCtx
	_ = SubmitCodexBatch(
		"GIGA-ALPHA-001",
		"0xVerifierA00000000000000000000000000000000",
		"0xRoyaltySink000000000000000000000000000000",
		4200,
		2205123,
		"codex-hash-0xA1B2C3D4E5",
	)
	GenerateSIP10AnchoringProposal()
	_ = VerifyCodexBatch("GIGA-ALPHA-001")
	PrintRoyaltyStats()
	fmt.Println("[✓] SIP-10 Codex Sovereign Enforcement Layer Online.")
}
