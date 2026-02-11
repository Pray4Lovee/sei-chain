package app

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/cosmos/cosmos-sdk/server"
)

const (
	sip9LedgerFile   = "sip9_soulmap_ledger.json"
	sip9ProposalFile = "sip9_anchor_proposal.json"
)

// SoulMapEntry defines a SIP-9 soul map entry.
type SoulMapEntry struct {
	Name          string `json:"name"`
	ProofAddress  string `json:"proof_address"`
	MeshRelay     string `json:"mesh_endpoint"`
	ZKFingerprint string `json:"zk_fingerprint"`
	Chain         string `json:"chain"`
	Timestamp     int64  `json:"timestamp"`
	Linked        bool   `json:"linked"`
}

// SoulMapLedger contains a collection of soul map entries.
type SoulMapLedger struct {
	Entries []SoulMapEntry `json:"entries"`
}

// RegisterSoulMap records a soul identity entry.
func RegisterSoulMap(name, addr, relay, fingerprint, chain string) error {
	ledger := LoadSoulMapLedger()
	entry := SoulMapEntry{
		Name:          name,
		ProofAddress:  strings.ToLower(addr),
		MeshRelay:     relay,
		ZKFingerprint: fingerprint,
		Chain:         chain,
		Timestamp:     time.Now().Unix(),
		Linked:        true,
	}
	ledger.Entries = append(ledger.Entries, entry)
	return SaveSoulMapLedger(ledger)
}

// LoadSoulMapLedger loads the ledger from disk when present.
func LoadSoulMapLedger() SoulMapLedger {
	var ledger SoulMapLedger
	data, err := os.ReadFile(sip9LedgerFile)
	if err != nil {
		return ledger
	}
	_ = json.Unmarshal(data, &ledger)
	return ledger
}

// SaveSoulMapLedger persists the ledger to disk.
func SaveSoulMapLedger(ledger SoulMapLedger) error {
	data, err := json.MarshalIndent(ledger, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(sip9LedgerFile, data, 0o644)
}

// ViewZkMeshByChain returns linked entries for a chain.
func ViewZkMeshByChain(chain string) []SoulMapEntry {
	ledger := LoadSoulMapLedger()
	var out []SoulMapEntry
	for _, entry := range ledger.Entries {
		if strings.EqualFold(entry.Chain, chain) && entry.Linked {
			out = append(out, entry)
		}
	}
	return out
}

// GenerateSIP9AnchoringProposal writes a SIP-9 proposal file.
func GenerateSIP9AnchoringProposal() {
	proposal := map[string]any{
		"title":       "SIP-9: SoulMapRelay + zkSyncMesh + AuthorChain Interop",
		"description": "Anchors cross-chain zk-identity proofs, sovereign author relays, and codex-indexed mesh topology.",
		"file":        sip9LedgerFile,
		"deposit":     "9300000usei",
	}
	res, _ := json.MarshalIndent(proposal, "", "  ")
	_ = os.WriteFile(sip9ProposalFile, res, 0o644)
	fmt.Println("[✓] SIP-9 Anchoring Proposal written.")
}

// InitCodexSIP9 initializes the SIP-9 soul mesh entries.
func InitCodexSIP9(ctx context.Context, serverCtx *server.Context) {
	_ = ctx
	_ = RegisterSoulMap(
		"keeper.eth",
		"0xSoulSigil00000000000000000000000000000000",
		"https://relay.codex.zone/soul/keeper",
		"zkp-fingerprint-0xa1b2c3d4",
		"sei-mainnet",
	)
	GenerateSIP9AnchoringProposal()
	linked := ViewZkMeshByChain("sei-mainnet")
	for _, entry := range linked {
		fmt.Printf("[✓] Linked Soul: %s (%s) → %s\n", entry.Name, entry.ProofAddress, entry.MeshRelay)
	}
	fmt.Println("[✓] SIP-9 SoulMapRelay Mesh Interop Ready.")
	_ = serverCtx
}
