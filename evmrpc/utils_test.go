package evmrpc_test

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/rpc"
	"github.com/sei-protocol/sei-chain/app"
	"github.com/sei-protocol/sei-chain/evmrpc"
	"github.com/stretchr/testify/require"
	rpcmock "github.com/tendermint/tendermint/rpc/client/mock"
	coretypes "github.com/tendermint/tendermint/rpc/coretypes"
)

func TestCheckVersion(t *testing.T) {
	testApp := app.Setup(false, false, false)
	k := &testApp.EvmKeeper
	ctx := testApp.GetContextForDeliverTx([]byte{}).WithBlockHeight(1)
	testApp.Commit(context.Background()) // bump store version to 1
	require.Nil(t, evmrpc.CheckVersion(ctx, k))
	ctx = ctx.WithBlockHeight(2)
	require.NotNil(t, evmrpc.CheckVersion(ctx, k))
}

func TestParallelRunnerPanicRecovery(t *testing.T) {
	r := evmrpc.NewParallelRunner(10, 10)
	r.Queue <- func() {
		panic("should be handled")
	}
	close(r.Queue)
	require.NotPanics(t, r.Done.Wait)
}

func TestValidateBlockAccess(t *testing.T) {
	params := evmrpc.BlockValidationParams{LatestHeight: 100, MaxBlockLookback: 10, EarliestVersion: 50}
	require.NoError(t, evmrpc.ValidateBlockAccess(95, params))
	err := evmrpc.ValidateBlockAccess(80, params)
	require.Error(t, err)
	terr := err.(*evmrpc.TraceError)
	require.Equal(t, evmrpc.ErrCodeBlockPruned, terr.Code)
}

func TestValidateBlockNumberAccess(t *testing.T) {
	params := evmrpc.BlockValidationParams{LatestHeight: 100, MaxBlockLookback: 10, EarliestVersion: 1}
	require.NoError(t, evmrpc.ValidateBlockNumberAccess(rpc.LatestBlockNumber, params))
	err := evmrpc.ValidateBlockNumberAccess(rpc.BlockNumber(80), params)
	require.Error(t, err)
}

type hashMock struct {
	rpcmock.Client
	res *coretypes.ResultBlock
	err error
}

func (h hashMock) BlockByHash(ctx context.Context, hash []byte) (*coretypes.ResultBlock, error) {
	return h.res, h.err
}

func TestValidateBlockHashAccess(t *testing.T) {
	client := hashMock{res: &coretypes.ResultBlock{Block: &coretypes.Block{Height: 90}}}
	params := evmrpc.BlockValidationParams{LatestHeight: 100, MaxBlockLookback: 10, EarliestVersion: 1}
	require.NoError(t, evmrpc.ValidateBlockHashAccess(context.Background(), client, common.HexToHash("0x1"), params))
	params.EarliestVersion = 95
	err := evmrpc.ValidateBlockHashAccess(context.Background(), client, common.HexToHash("0x1"), params)
	require.Error(t, err)
}

func TestTraceErrorFormatting(t *testing.T) {
	err := &evmrpc.TraceError{Code: evmrpc.ErrCodeBlockPruned, Message: "low", Height: 10, Base: 20}
	require.Contains(t, err.Error(), evmrpc.ErrCodeBlockPruned)
}
