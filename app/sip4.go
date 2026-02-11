package app

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/cosmos/cosmos-sdk/server"
	"github.com/ethereum/go-ethereum/common"
)

// RegisteredContract defines a SIP-4 contract entry with royalty metadata.
type RegisteredContract struct {
	Address     string `json:"address"`
	Deployer    string `json:"deployer"`
	ABIPath     string `json:"abi_path"`
	Purpose     string `json:"purpose"`
	Timestamp   int64  `json:"timestamp"`
	CodeHash    string `json:"code_hash"`
	Verified    bool   `json:"verified"`
	RoyaltyRate int    `json:"royalty_rate"`
	RoyaltyAddr string `json:"royalty_receiver"`
}

// ContractIndex is the persisted registry payload.
type ContractIndex struct {
	Contracts []RegisteredContract `json:"contracts"`
}

// RegisterSIP4Contract stores contract metadata alongside royalty information.
func RegisterSIP4Contract(addr, deployer, abiPath, purpose, hash string, verified bool, royalty int, royaltyAddr string) error {
	if !common.IsHexAddress(addr) || !common.IsHexAddress(deployer) || !common.IsHexAddress(royaltyAddr) {
		return errors.New("invalid address format")
	}
	index := LoadContractIndex()
	entry := RegisteredContract{
		Address:     strings.ToLower(addr),
		Deployer:    strings.ToLower(deployer),
		ABIPath:     abiPath,
		Purpose:     purpose,
		Timestamp:   time.Now().Unix(),
		CodeHash:    hash,
		Verified:    verified,
		RoyaltyRate: royalty,
		RoyaltyAddr: strings.ToLower(royaltyAddr),
	}
	index.Contracts = append(index.Contracts, entry)
	return SaveContractIndex(index)
}

// LoadContractIndex reads the SIP-4 registry from disk.
func LoadContractIndex() ContractIndex {
	var idx ContractIndex
	b, err := os.ReadFile("sip4_registry.json")
	if err == nil {
		_ = json.Unmarshal(b, &idx)
	}
	return idx
}

// SaveContractIndex writes the registry to disk.
func SaveContractIndex(index ContractIndex) error {
	b, err := json.MarshalIndent(index, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("sip4_registry.json", b, 0o644)
}

// ViewContractsByDeployer filters registered contracts by deployer address.
func ViewContractsByDeployer(deployer string) []RegisteredContract {
	index := LoadContractIndex()
	out := []RegisteredContract{}
	for _, c := range index.Contracts {
		if strings.EqualFold(c.Deployer, deployer) {
			out = append(out, c)
		}
	}
	return out
}

// HashContractBytecode returns a deterministic SHA-256 checksum.
func HashContractBytecode(code []byte) string {
	return fmt.Sprintf("0x%x", sha256.Sum256(code))
}

// GenerateSIP4AnchoringProposal writes a SIP-4 anchoring proposal artifact.
func GenerateSIP4AnchoringProposal() {
	proposal := map[string]any{
		"title":       "SIP-4: Codex Registry + Royalty",
		"description": "Anchors the sovereign contract registry and authorship-enforced royalties for all EVM deployments.",
		"file":        "sip4_registry.json",
		"deposit":     "10000000usei",
	}
	res, err := json.MarshalIndent(proposal, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile("sip4_anchor_proposal.json", res, 0o644)
	fmt.Println("[✓] SIP-4+ Registry Proposal written.")
}

// EnforceRoyalty computes the receiver share based on basis points.
func EnforceRoyalty(receiver string, amount int64, rate int) int64 {
	if rate <= 0 || rate > 10_000 {
		return 0
	}
	share := (amount * int64(rate)) / 10_000
	fmt.Printf("[Royalty] %s receives %d (%.2f%%)\n", receiver, share, float64(rate)/100)
	return share
}

// InitCodexSIP4 bootstraps the registry and royalty artifacts.
func InitCodexSIP4(ctx context.Context, serverCtx *server.Context) {
	_ = ctx
	_ = serverCtx
	_ = RegisterSIP4Contract(
		"0xABCDEF000000000000000000000000000000ABCD",
		"0xDeaDBeefCafe0000000000000000000000000000",
		"erc721.json",
		"SoulSigil Collection",
		"0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
		true,
		500, // 5.00% royalty
		"0xFEEc0FFEEc0ffEec0FfeEc0fFeEc0FfeEC0fFEE0",
	)
	GenerateSIP4AnchoringProposal()
	contracts := ViewContractsByDeployer("0xDeaDBeefCafe0000000000000000000000000000")
	for _, c := range contracts {
		fmt.Printf("[✓] Registered: %s (%s) royalty: %d bps → %s\n", c.Address, c.Purpose, c.RoyaltyRate, c.RoyaltyAddr)
	}
	fmt.Println("[✓] SIP-4 Sovereign Registry & Royalty Layer Ready.")
}
