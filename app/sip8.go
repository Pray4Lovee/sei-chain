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

// FacilitatorFeeRecord tracks a facilitator fee settlement.
type FacilitatorFeeRecord struct {
	SettlementID string `json:"settlement_id"`
	Facilitator  string `json:"facilitator"`
	Amount       string `json:"amount"`
	Chain        string `json:"chain"`
	FeeType      string `json:"fee_type"`
	Vault        string `json:"vault_address"`
	Timestamp    int64  `json:"timestamp"`
	Settled      bool   `json:"settled"`
}

// FacilitatorFeeLedger captures all facilitator fee records.
type FacilitatorFeeLedger struct {
	Records []FacilitatorFeeRecord `json:"records"`
}

// RecordFacilitatorFee appends a facilitator fee record to the ledger file.
func RecordFacilitatorFee(id, facilitator, amount, chain, feeType, vault string) error {
	ledger := LoadFacilitatorLedger()
	rec := FacilitatorFeeRecord{
		SettlementID: id,
		Facilitator:  strings.ToLower(facilitator),
		Amount:       amount,
		Chain:        chain,
		FeeType:      feeType,
		Vault:        strings.ToLower(vault),
		Timestamp:    time.Now().Unix(),
		Settled:      false,
	}
	ledger.Records = append(ledger.Records, rec)
	return SaveFacilitatorLedger(ledger)
}

// LoadFacilitatorLedger reads the SIP-8 fee ledger.
func LoadFacilitatorLedger() FacilitatorFeeLedger {
	var ledger FacilitatorFeeLedger
	data, err := os.ReadFile("sip8_facilitator_fees.json")
	if err == nil {
		_ = json.Unmarshal(data, &ledger)
	}
	return ledger
}

// SaveFacilitatorLedger persists the SIP-8 fee ledger.
func SaveFacilitatorLedger(ledger FacilitatorFeeLedger) error {
	data, err := json.MarshalIndent(ledger, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("sip8_facilitator_fees.json", data, 0o644)
}

// SettleFacilitatorFee marks a fee record as settled.
func SettleFacilitatorFee(id string) error {
	ledger := LoadFacilitatorLedger()
	for i, record := range ledger.Records {
		if record.SettlementID == id && !record.Settled {
			fmt.Printf("[✓] Settled %s %s to %s\n", record.Amount, record.FeeType, record.Facilitator)
			ledger.Records[i].Settled = true
			return SaveFacilitatorLedger(ledger)
		}
	}
	return fmt.Errorf("settlement not found or already settled: %s", id)
}

// GenerateSIP8AnchoringProposal writes the SIP-8 anchoring proposal file.
func GenerateSIP8AnchoringProposal() {
	proposal := map[string]any{
		"title":       "SIP-8: x402 FacilitatorFee + MCP Escrow Tracker",
		"description": "Anchors sovereign fee receipts, cross-chain relayer flow, and x402 vault-linked settlements for revenue routing.",
		"file":        "sip8_facilitator_fees.json",
		"deposit":     "8800000usei",
	}
	res, err := json.MarshalIndent(proposal, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile("sip8_anchor_proposal.json", res, 0o644)
	fmt.Println("[✓] SIP-8 Anchoring Proposal written.")
}

// InitCodexSIP8 triggers SIP-8 fee recording, anchoring, and settlement.
func InitCodexSIP8(ctx context.Context, serverCtx *server.Context) {
	_ = ctx
	_ = serverCtx
	_ = RecordFacilitatorFee(
		"SETTLE-0001",
		"0xFacilitator000000000000000000000000000000",
		"3200000000",
		"sei-mainnet",
		"mcp-facilitator",
		"0xVault000000000000000000000000000000000042",
	)
	GenerateSIP8AnchoringProposal()
	if err := SettleFacilitatorFee("SETTLE-0001"); err != nil {
		fmt.Println("[!] Settlement error:", err)
	}
	fmt.Println("[✓] SIP-8 x402 Fee Enforcement + MCP Flow Registered.")
}
