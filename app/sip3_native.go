package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/cosmos/cosmos-sdk/server"
)

const (
	sip3NativeExecutionLogFile = "sip3_native_execution_log.json"
	sip3NativeRedirectLogFile  = "sip3_native_redirect_log.json"
)

// Supported SIP-3 opcode values for Sei-native execution.
var sip3NativeOpCodes = map[string]struct{}{
	"VAULT_SUM":  {},
	"REDEEM_KIN": {},
	"EXEC_MCP":   {},
	"BATCH_PULL": {},
	"SIGIL_SYNC": {},
	"ESCROW_LIQ": {},
}

// SeiNativeExecution captures a single Sei-native inference + routing attempt.
type SeiNativeExecution struct {
	TxID            uint64 `json:"tx_id"`
	SigilID         uint64 `json:"sigil_id"`
	VaultID         uint64 `json:"vault_id"`
	OpCode          string `json:"op_code"`
	AuthorizedBy    string `json:"authorized_by"`
	Destination     string `json:"destination"`
	Entropy         string `json:"entropy"`
	CovenantHash    string `json:"covenant_hash"`
	TriggerHash     string `json:"trigger_hash"`
	ExecutionLog    string `json:"execution_log"`
	ReplayProtected bool   `json:"replay_protected"`
	Timestamp       int64  `json:"timestamp"`
}

// SeiNativeExecutionLog is the persisted execution stream.
type SeiNativeExecutionLog struct {
	Executions []SeiNativeExecution `json:"executions"`
}

// SeiNativeRedirect stores deterministic vault routing decisions.
type SeiNativeRedirect struct {
	VaultID      uint64 `json:"vault_id"`
	From         string `json:"from"`
	To           string `json:"to"`
	EscrowUnlock bool   `json:"escrow_unlock"`
	Timestamp    int64  `json:"timestamp"`
}

// SeiNativeRedirectLog is the persisted routing stream.
type SeiNativeRedirectLog struct {
	Routes []SeiNativeRedirect `json:"routes"`
}

// SaveSeiNativeExecution appends a new SIP-3 execution entry with replay protection.
func SaveSeiNativeExecution(exec SeiNativeExecution) error {
	log := LoadSeiNativeExecutionLog()
	for _, existing := range log.Executions {
		if existing.TxID == exec.TxID {
			return fmt.Errorf("duplicate tx id: %d", exec.TxID)
		}
	}
	log.Executions = append(log.Executions, exec)
	return writeJSONFile(sip3NativeExecutionLogFile, log)
}

// LoadSeiNativeExecutionLog reads the persisted execution log from disk.
func LoadSeiNativeExecutionLog() SeiNativeExecutionLog {
	var log SeiNativeExecutionLog
	readJSONFile(sip3NativeExecutionLogFile, &log)
	return log
}

// SaveSeiNativeRedirect appends a route decision to the SIP-3 redirect log.
func SaveSeiNativeRedirect(route SeiNativeRedirect) error {
	log := LoadSeiNativeRedirectLog()
	log.Routes = append(log.Routes, route)
	return writeJSONFile(sip3NativeRedirectLogFile, log)
}

// LoadSeiNativeRedirectLog reads the persisted redirect log from disk.
func LoadSeiNativeRedirectLog() SeiNativeRedirectLog {
	var log SeiNativeRedirectLog
	readJSONFile(sip3NativeRedirectLogFile, &log)
	return log
}

// ValidateSeiNativeReplay ensures a tx has not already been executed.
func ValidateSeiNativeReplay(txID uint64) error {
	log := LoadSeiNativeExecutionLog()
	for _, exec := range log.Executions {
		if exec.TxID == txID {
			return fmt.Errorf("replay detected for tx id: %d", txID)
		}
	}
	return nil
}

// TriggerSeiNativeInference validates opcode and returns trigger metadata.
func TriggerSeiNativeInference(sigilID uint64, opCode string) (string, string, error) {
	opCode = strings.ToUpper(strings.TrimSpace(opCode))
	if _, ok := sip3NativeOpCodes[opCode]; !ok {
		return "", "", fmt.Errorf("unsupported opcode: %s", opCode)
	}
	entropy := hashHex(fmt.Sprintf("entropy:%d:%s:%d", sigilID, opCode, time.Now().UnixNano()))
	triggerHash := hashHex(fmt.Sprintf("trigger:%d:%s:%s", sigilID, opCode, entropy))
	return entropy, triggerHash, nil
}

// RouteSeiNativeWithdraw records deterministic vault redirect routing.
func RouteSeiNativeWithdraw(from, to string, vaultID uint64) error {
	route := SeiNativeRedirect{
		VaultID:      vaultID,
		From:         strings.ToLower(from),
		To:           strings.ToLower(to),
		EscrowUnlock: strings.Contains(strings.ToLower(to), "escrow"),
		Timestamp:    time.Now().Unix(),
	}
	return SaveSeiNativeRedirect(route)
}

// ExecuteSeiNativeAutoWithdraw runs SIP-3 execution flow for Sei-native routing.
func ExecuteSeiNativeAutoWithdraw(txID, vaultID, sigilID uint64, requester, destination, opCode string) error {
	if err := ValidateSeiNativeReplay(txID); err != nil {
		return err
	}
	if strings.TrimSpace(requester) == "" {
		return fmt.Errorf("missing requester")
	}
	entropy, triggerHash, err := TriggerSeiNativeInference(sigilID, opCode)
	if err != nil {
		return err
	}
	if err := RouteSeiNativeWithdraw(requester, destination, vaultID); err != nil {
		return err
	}

	execPath := filepath.ToSlash(fmt.Sprintf("codex/exec/%d_%d_exec.json", sigilID, vaultID))
	exec := SeiNativeExecution{
		TxID:            txID,
		SigilID:         sigilID,
		VaultID:         vaultID,
		OpCode:          strings.ToUpper(opCode),
		AuthorizedBy:    strings.ToLower(requester),
		Destination:     destination,
		Entropy:         entropy,
		CovenantHash:    hashHex(fmt.Sprintf("covenant:%d:%d:%s", sigilID, vaultID, requester)),
		TriggerHash:     triggerHash,
		ExecutionLog:    execPath,
		ReplayProtected: true,
		Timestamp:       time.Now().Unix(),
	}
	if err := SaveSeiNativeExecution(exec); err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(execPath), 0o755); err != nil {
		return err
	}
	return writeJSONFile(execPath, exec)
}

// InitSeiNativeSIP3Executor seeds an example SIP-3 Sei-native execution.
func InitSeiNativeSIP3Executor(_ context.Context, _ *server.Context) {
	if err := ExecuteSeiNativeAutoWithdraw(
		1,
		33,
		1422,
		"0x14e5Ea3751e7C2588348E22b847628EE1aAD81A5",
		"x402Escrow.sol",
		"EXEC_MCP",
	); err != nil {
		fmt.Println("[!] SIP-3 Sei-native execution failed:", err)
		return
	}
	fmt.Println("[✓] SIP-3 Sei-native execution flow recorded.")
}

func hashHex(input string) string {
	sum := sha256.Sum256([]byte(input))
	return "0x" + hex.EncodeToString(sum[:])
}

func readJSONFile(path string, out any) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	_ = json.Unmarshal(data, out)
}

func writeJSONFile(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
