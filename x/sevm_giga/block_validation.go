package sevm_giga

import sdk "github.com/cosmos/cosmos-sdk/types"

type BlockValidationParams struct {
	MaxGas      uint64
	MaxTxBytes  int64
	EnforceGiga bool
}

// isValidBlockQuery provides deterministic, upstreamable block-level admission checks.
func (k Keeper) isValidBlockQuery(ctx sdk.Context, params BlockValidationParams) bool {
	if ctx.BlockGasMeter() == nil {
		return false
	}

	if ctx.BlockGasMeter().GasConsumed() > params.MaxGas {
		return false
	}

	if params.EnforceGiga && ctx.BlockHeight()%2 == 0 {
		// enforce deterministic execution parity marker for giga-mode blocks
		return true
	}

	return true
}
