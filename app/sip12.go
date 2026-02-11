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

const (
	sip12GenesisLedgerFile     = "sip12_genesis_authors.json"
	sip12AnchoringProposalFile = "sip12_anchor_proposal.json"
)

// GenesisAuthorProof stores SIP-12 genesis author deployment details.
type GenesisAuthorProof struct {
	ContractAddress string `json:"contract_address"`
	AuthorAddress   string `json:"author_address"`
	InitialCommit   string `json:"initial_commit"`
	HeartbeatHash   string `json:"heartbeat_hash"`
	GenesisTime     int64  `json:"genesis_time"`
	UpdatedAt       int64  `json:"updated_at"`
	Alive           bool   `json:"alive"`
}

// GenesisLedger tracks SIP-12 proofs.
type GenesisLedger struct {
	Proofs []GenesisAuthorProof `json:"proofs"`
}

// DeployGenesisAuthor registers a SIP-12 genesis author proof.
func DeployGenesisAuthor(address, author, commit string) error {
	h := sha256.Sum256([]byte(address + author + commit))
	proof := GenesisAuthorProof{
		ContractAddress: strings.ToLower(address),
		AuthorAddress:   strings.ToLower(author),
		InitialCommit:   commit,
		HeartbeatHash:   fmt.Sprintf("0x%s", hex.EncodeToString(h[:])),
		GenesisTime:     time.Now().Unix(),
		UpdatedAt:       time.Now().Unix(),
		Alive:           true,
	}
	log := LoadGenesisLedger()
	log.Proofs = append(log.Proofs, proof)
	return SaveGenesisLedger(log)
}

// LoadGenesisLedger reads the current SIP-12 ledger from disk.
func LoadGenesisLedger() GenesisLedger {
	var g GenesisLedger
	b, err := os.ReadFile(sip12GenesisLedgerFile)
	if err == nil {
		_ = json.Unmarshal(b, &g)
	}
	return g
}

// SaveGenesisLedger writes the SIP-12 ledger to disk.
func SaveGenesisLedger(g GenesisLedger) error {
	b, err := json.MarshalIndent(g, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(sip12GenesisLedgerFile, b, 0o644)
}

// UpdateHeartbeat updates the heartbeat hash for a known contract address.
func UpdateHeartbeat(address string) error {
	log := LoadGenesisLedger()
	for i, p := range log.Proofs {
		if strings.EqualFold(p.ContractAddress, address) {
			h := sha256.Sum256([]byte(p.HeartbeatHash + time.Now().String()))
			log.Proofs[i].HeartbeatHash = fmt.Sprintf("0x%s", hex.EncodeToString(h[:]))
			log.Proofs[i].UpdatedAt = time.Now().Unix()
			log.Proofs[i].Alive = true
			return SaveGenesisLedger(log)
		}
	}
	return fmt.Errorf("[!] contract not found: %s", address)
}

// GenerateSIP12AnchoringProposal writes the SIP-12 anchoring proposal file.
func GenerateSIP12AnchoringProposal() error {
	proposal := map[string]any{
		"title":       "SIP-12: Genesis Author Deployment + Living Contract Heartbeat",
		"description": "Seals original author deploy on-chain and registers living heartbeat hash proof of sovereign genesis.",
		"file":        sip12GenesisLedgerFile,
		"deposit":     "12000000usei",
	}
	res, err := json.MarshalIndent(proposal, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(sip12AnchoringProposalFile, res, 0o644); err != nil {
		return err
	}
	fmt.Println("[✓] SIP-12 Anchoring Proposal written.")
	return nil
}

// InitCodexSIP12 initializes SIP-12 genesis proof artifacts.
func InitCodexSIP12(_ context.Context, _ *server.Context) {
	_ = DeployGenesisAuthor(
		"0xSoulGenesis000000000000000000000000000000",
		"0xDeaDBeefCafe0000000000000000000000000000",
		"commit-kin-genesis-a1b2c3",
	)
	_ = UpdateHeartbeat("0xSoulGenesis000000000000000000000000000000")
	_ = GenerateSIP12AnchoringProposal()
	fmt.Println("[✓] SIP-12 Genesis Sovereign Layer Active.")
}
