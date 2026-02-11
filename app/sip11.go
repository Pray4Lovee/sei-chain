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

// SovereignSession tracks SIP-11 session metadata.
type SovereignSession struct {
	SessionID     string `json:"session_id"`
	Author        string `json:"author"`
	CodexVersion  string `json:"codex_version"`
	EpochStarted  int64  `json:"epoch_started"`
	Finalized     bool   `json:"finalized"`
	ForkproofHash string `json:"forkproof_hash"`
}

// SovereignSessionLog stores all sovereign sessions.
type SovereignSessionLog struct {
	Sessions []SovereignSession `json:"sessions"`
}

// StartSovereignSession creates and stores a new session.
func StartSovereignSession(sessionID, author, codexVersion, raw string) error {
	hash := sha256.Sum256([]byte(raw))
	session := SovereignSession{
		SessionID:     sessionID,
		Author:        strings.ToLower(author),
		CodexVersion:  codexVersion,
		EpochStarted:  time.Now().Unix(),
		Finalized:     false,
		ForkproofHash: fmt.Sprintf("0x%s", hex.EncodeToString(hash[:])),
	}
	log := LoadSovereignSessionLog()
	log.Sessions = append(log.Sessions, session)
	return SaveSovereignSessionLog(log)
}

// FinalizeSession marks a session as finalized.
func FinalizeSession(sessionID string) error {
	log := LoadSovereignSessionLog()
	for i, session := range log.Sessions {
		if session.SessionID == sessionID && !session.Finalized {
			log.Sessions[i].Finalized = true
			fmt.Printf("[✓] Session Finalized: %s (%s)\n", sessionID, session.ForkproofHash)
			return SaveSovereignSessionLog(log)
		}
	}
	return fmt.Errorf("[!] Session not found or already finalized: %s", sessionID)
}

// LoadSovereignSessionLog loads SIP-11 session history from disk.
func LoadSovereignSessionLog() SovereignSessionLog {
	var log SovereignSessionLog
	data, err := os.ReadFile("sip11_sessions.json")
	if err == nil {
		_ = json.Unmarshal(data, &log)
	}
	return log
}

// SaveSovereignSessionLog persists SIP-11 session history.
func SaveSovereignSessionLog(log SovereignSessionLog) error {
	data, _ := json.MarshalIndent(log, "", "  ")
	return os.WriteFile("sip11_sessions.json", data, 0o644)
}

// GenerateSIP11AnchoringProposal writes a SIP-11 anchor proposal.
func GenerateSIP11AnchoringProposal() {
	proposal := map[string]any{
		"title":       "SIP-11: Codex Sovereign Session Finalization",
		"description": "Seals Codex sovereignty via session hash finalization, forkproof digest, and sovereign epoch record.",
		"file":        "sip11_sessions.json",
		"deposit":     "11000000usei",
	}
	result, _ := json.MarshalIndent(proposal, "", "  ")
	_ = os.WriteFile("sip11_anchor_proposal.json", result, 0o644)
	fmt.Println("[✓] SIP-11 Anchoring Proposal written.")
}

// InitCodexSIP11 finalizes a seeded SIP-11 session.
func InitCodexSIP11(ctx context.Context, serverCtx *server.Context) {
	_ = ctx
	_ = serverCtx
	sessionID := "SESSION-KIN-GIGA-001"
	author := "0xKeeper000000000000000000000000000000000000"
	version := "codex-v1.0.0"
	source := "Full SIP Chain Executed: 1 → 11 with sovereign authorship enforced."
	_ = StartSovereignSession(sessionID, author, version, source)
	GenerateSIP11AnchoringProposal()
	_ = FinalizeSession(sessionID)
	fmt.Println("[✓] SIP-11 Codex Final Sovereignty Lock Complete.")
}
