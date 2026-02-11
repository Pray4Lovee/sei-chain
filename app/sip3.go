package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/CosmWasm/wasmd/x/wasm/types"
	"github.com/cosmos/cosmos-sdk/server"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// DisableCosmWasm clears CosmWasm state and disables further uploads/instantiations.
func (app *App) DisableCosmWasm(ctx sdk.Context) {
	fmt.Println("[SIP-3] CosmWasm Deactivation Triggered")
	app.WasmKeeper.SetParams(ctx, types.Params{
		CodeUploadAccess:             types.NoAccessConfig(),
		InstantiateDefaultPermission: types.AccessTypeNobody,
	})
	store := ctx.KVStore(app.GetKey(types.StoreKey))
	it := sdk.KVStorePrefixIterator(store, nil)
	defer it.Close()
	for ; it.Valid(); it.Next() {
		store.Delete(it.Key())
	}
	fmt.Println("[SIP-3] CosmWasm state wiped.")
}

// GenerateERC20MigrationConfig converts a CW20 descriptor into an ERC20-compatible JSON config.
func GenerateERC20MigrationConfig(input string) error {
	data, err := os.ReadFile(input)
	if err != nil {
		return err
	}
	var cw20 struct {
		Name     string `json:"name"`
		Symbol   string `json:"symbol"`
		Decimals int    `json:"decimals"`
		Supply   string `json:"total_supply"`
	}
	if err := json.Unmarshal(data, &cw20); err != nil {
		return err
	}
	out := map[string]any{
		"name":        cw20.Name,
		"symbol":      cw20.Symbol,
		"decimals":    cw20.Decimals,
		"totalSupply": cw20.Supply,
	}
	res, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("erc20_migrated.json", res, 0o644)
}

// GenerateUpgradeProposal writes a standard SIP-3 upgrade proposal JSON to disk.
func GenerateUpgradeProposal() error {
	proposal := map[string]any{
		"title":       "SIP-3: EVM-Only Upgrade",
		"description": "This upgrade deprecates CosmWasm and activates EVM-only execution.",
		"upgrade": map[string]any{
			"name":   "evm-only",
			"height": 9_500_000,
		},
		"deposit": "10000000usei",
	}
	res, err := json.MarshalIndent(proposal, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile("sip3_upgrade_proposal.json", res, 0o644); err != nil {
		return err
	}
	fmt.Println("[✓] Proposal written: sip3_upgrade_proposal.json")
	return nil
}

// TestCosmWasmDeactivation verifies that the CosmWasm store has been fully purged.
func TestCosmWasmDeactivation(ctx sdk.Context, storeKey storetypes.StoreKey) error {
	store := ctx.KVStore(storeKey)
	it := sdk.KVStorePrefixIterator(store, nil)
	defer it.Close()
	if it.Valid() {
		return fmt.Errorf("[!] Residual CosmWasm found: %x", it.Key())
	}
	fmt.Println("[✓] CosmWasm fully purged")
	return nil
}

// RunEVMBenchmark prints synthetic gas usage numbers for a set of transactions.
func RunEVMBenchmark(txCount int) {
	if txCount <= 0 {
		fmt.Println("[!] txCount must be greater than zero")
		return
	}
	rand.Seed(time.Now().UnixNano())
	total := int64(0)
	for i := 0; i < txCount; i++ {
		g := int64(21_000 + rand.Intn(8_000))
		total += g
		fmt.Printf("tx %d gas: %d\n", i+1, g)
	}
	fmt.Printf("[✓] avg gas: %d (over %d txs)\n", total/int64(txCount), txCount)
}

// ValidateEVMABI scans ABI JSON for payable functions and emits warnings.
func ValidateEVMABI(contractPath string) error {
	data, err := os.ReadFile(contractPath)
	if err != nil {
		return err
	}
	var abi []map[string]any
	if err := json.Unmarshal(data, &abi); err != nil {
		return errors.New("invalid ABI format")
	}
	warns := 0
	for _, fn := range abi {
		if fn["type"] == "function" && strings.Contains(fmt.Sprint(fn["stateMutability"]), "payable") {
			fmt.Println("[WARN] Payable function:", fn["name"])
			warns++
		}
	}
	fmt.Printf("[✓] ABI validated: %d warnings\n", warns)
	return nil
}

// CodexIncentiveNotice prints the SIP-3 incentive notice.
func CodexIncentiveNotice() {
	fmt.Println("[💸] SIP-3 bounty active: Top tool, dApp, dashboard earn 500K SEI")
}

// InitCodexSIP3 runs the one-shot SIP-3 activation flow.
func InitCodexSIP3(ctx context.Context, app *App, serverCtx *server.Context) {
	_ = ctx
	_ = serverCtx
	if err := GenerateUpgradeProposal(); err != nil {
		fmt.Println("[!] Proposal generation failed:", err)
	}
	if err := GenerateERC20MigrationConfig("cw20_sample.json"); err != nil {
		fmt.Println("[!] ERC20 migration config failed:", err)
	}
	sdkCtx := app.BaseApp.NewContext(false, sdk.Header{})
	if err := TestCosmWasmDeactivation(sdkCtx, app.GetKey(types.StoreKey)); err != nil {
		panic(err)
	}
	RunEVMBenchmark(100)
	if err := ValidateEVMABI("evm_erc20_abi.json"); err != nil {
		fmt.Println("[!] ABI validation failed:", err)
	}
	CodexIncentiveNotice()
	fmt.Println("[✓] SIP-3 Sovereign Activation Complete.")
}
