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

// RoyaltyEscrowVault defines a one-shot cross-chain royalty escrow vault.
type RoyaltyEscrowVault struct {
	VaultID        string `json:"vault_id"`
	Owner          string `json:"owner"`
	RelayerAddress string `json:"relayer"`
	Amount         string `json:"amount"`
	Chain          string `json:"origin_chain"`
	Timestamp      int64  `json:"timestamp"`
	Released       bool   `json:"released"`
}

// VaultRegistry is a ledger of royalty escrow vaults.
type VaultRegistry struct {
	Vaults []RoyaltyEscrowVault `json:"vaults"`
}

// RegisterVault registers a cross-chain royalty vault entry.
func RegisterVault(id, owner, relayer, amount, chain string) error {
	vr := LoadVaultRegistry()
	vault := RoyaltyEscrowVault{
		VaultID:        id,
		Owner:          strings.ToLower(owner),
		RelayerAddress: strings.ToLower(relayer),
		Amount:         amount,
		Chain:          chain,
		Timestamp:      time.Now().Unix(),
		Released:       false,
	}
	vr.Vaults = append(vr.Vaults, vault)
	return SaveVaultRegistry(vr)
}

// LoadVaultRegistry loads the local SIP-6 escrow vault registry if it exists.
func LoadVaultRegistry() VaultRegistry {
	var vr VaultRegistry
	b, err := os.ReadFile("sip6_escrow_vaults.json")
	if err == nil {
		_ = json.Unmarshal(b, &vr)
	}
	return vr
}

// SaveVaultRegistry writes the SIP-6 escrow vault registry to disk.
func SaveVaultRegistry(vr VaultRegistry) error {
	b, err := json.MarshalIndent(vr, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("sip6_escrow_vaults.json", b, 0o644)
}

// ReleaseVaultByID marks a vault as released to its relayer.
func ReleaseVaultByID(id string) error {
	vr := LoadVaultRegistry()
	for i, v := range vr.Vaults {
		if v.VaultID == id && !v.Released {
			fmt.Printf("[✓] Releasing %s SEI to %s for vault %s\n", v.Amount, v.RelayerAddress, id)
			vr.Vaults[i].Released = true
			return SaveVaultRegistry(vr)
		}
	}
	return fmt.Errorf("vault not found or already released: %s", id)
}

// GenerateSIP6AnchoringProposal writes a governance proposal template for SIP-6.
func GenerateSIP6AnchoringProposal() {
	proposal := map[string]any{
		"title":       "SIP-6: Cross-Chain Royalty Relayer Vaults",
		"description": "Establishes registry for tracked royalty escrow vaults across chains with relayer-based release enforcement.",
		"file":        "sip6_escrow_vaults.json",
		"deposit":     "9000000usei",
	}
	res, err := json.MarshalIndent(proposal, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile("sip6_anchor_proposal.json", res, 0o644)
	fmt.Println("[✓] SIP-6 Anchoring Proposal written.")
}

// InitCodexSIP6 deploys the SIP-6 vault registry and releases the seeded vault.
func InitCodexSIP6(ctx context.Context, serverCtx *server.Context) {
	_ = ctx
	_ = serverCtx
	_ = RegisterVault(
		"VAULT-SEI-0001",
		"0xDeaDBeefCafe0000000000000000000000000000",
		"0xRelayerABC000000000000000000000000000000",
		"2500000000", // 25 SEI
		"sei-mainnet",
	)
	GenerateSIP6AnchoringProposal()
	err := ReleaseVaultByID("VAULT-SEI-0001")
	if err != nil {
		fmt.Println("[!] Vault release error:", err)
	}
	fmt.Println("[✓] SIP-6 Cross-Chain Royalty Vault Complete.")
}
