package sevm_giga

import sdk "github.com/cosmos/cosmos-sdk/types"

// Keeper handles SeVM↔EVM bridging concerns for giga-mode validation.
type Keeper struct{}

// MsgServer is intentionally lightweight for initial wiring.
type MsgServer interface{}

// NewKeeper creates a keeper instance.
func NewKeeper() Keeper { return Keeper{} }

// ValidateBasicContext guards nil block gas meter usage in off-chain tests.
func ValidateBasicContext(ctx sdk.Context) bool {
	return ctx.BlockGasMeter() != nil
}
