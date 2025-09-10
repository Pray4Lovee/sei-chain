package evmrpc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"runtime/debug"
	"time"

	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/eth/tracers"
	_ "github.com/ethereum/go-ethereum/eth/tracers/js"
	_ "github.com/ethereum/go-ethereum/eth/tracers/native"
	"github.com/ethereum/go-ethereum/export"
	"github.com/ethereum/go-ethereum/rpc"
	"github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/sei-protocol/sei-chain/x/evm/keeper"
	"github.com/sei-protocol/sei-chain/x/evm/state"
	rpcclient "github.com/tendermint/tendermint/rpc/client"
)

const (
	IsPanicCacheSize = 5000
	IsPanicCacheTTL  = 1 * time.Minute
)

type DebugAPI struct {
	tracersAPI         *tracers.API
	tmClient           rpcclient.Client
	keeper             *keeper.Keeper
	ctxProvider        func(int64) sdk.Context
	txConfigProvider   func(int64) client.TxConfig
	connectionType     ConnectionType
	isPanicCache       *expirable.LRU[common.Hash, bool]
	backend            *Backend
	traceCallSemaphore chan struct{}
	maxBlockLookback   int64
	traceTimeout       time.Duration
}

func (api *DebugAPI) acquireTraceSemaphore() func() {
	if api.traceCallSemaphore != nil {
		api.traceCallSemaphore <- struct{}{}
		return func() { <-api.traceCallSemaphore }
	}
	return func() {}
}

func (api *DebugAPI) getBlockValidationParams() BlockValidationParams {
	ctx := api.ctxProvider(LatestCtxHeight)
	earliest, _ := ctx.MultiStore().GetEarliestVersion()
	return BlockValidationParams{
		LatestHeight:     ctx.BlockHeight(),
		MaxBlockLookback: api.maxBlockLookback,
		EarliestVersion:  earliest,
	}
}

func (api *DebugAPI) GetValidationWindow() BlockValidationParams {
	return api.getBlockValidationParams()
}

type SeiDebugAPI struct {
	*DebugAPI
}

func NewDebugAPI(
	tmClient rpcclient.Client,
	k *keeper.Keeper,
	ctxProvider func(int64) sdk.Context,
	txConfigProvider func(int64) client.TxConfig,
	config *SimulateConfig,
	app *baseapp.BaseApp,
	antehandler sdk.AnteHandler,
	connectionType ConnectionType,
	debugCfg Config,
) *DebugAPI {
	backend := NewBackend(ctxProvider, k, txConfigProvider, tmClient, config, app, antehandler)
	tracersAPI := tracers.NewAPI(backend)
	isPanicCache := expirable.NewLRU[common.Hash, bool](IsPanicCacheSize, func(common.Hash, bool) {}, IsPanicCacheTTL)

	var sem chan struct{}
	if debugCfg.MaxConcurrentTraceCalls > 0 {
		sem = make(chan struct{}, debugCfg.MaxConcurrentTraceCalls)
	}

	return &DebugAPI{
		tracersAPI:         tracersAPI,
		tmClient:           tmClient,
		keeper:             k,
		ctxProvider:        ctxProvider,
		txConfigProvider:   txConfigProvider,
		connectionType:     connectionType,
		isPanicCache:       isPanicCache,
		backend:            backend,
		traceCallSemaphore: sem,
		maxBlockLookback:   debugCfg.MaxTraceLookbackBlocks,
		traceTimeout:       debugCfg.TraceTimeout,
	}
}

func NewSeiDebugAPI(
	tmClient rpcclient.Client,
	k *keeper.Keeper,
	ctxProvider func(int64) sdk.Context,
	txConfigProvider func(int64) client.TxConfig,
	config *SimulateConfig,
	app *baseapp.BaseApp,
	antehandler sdk.AnteHandler,
	connectionType ConnectionType,
	debugCfg Config,
) *SeiDebugAPI {
	backend := NewBackend(ctxProvider, k, txConfigProvider, tmClient, config, app, antehandler)
	tracersAPI := tracers.NewAPI(backend)

	var sem chan struct{}
	if debugCfg.MaxConcurrentTraceCalls > 0 {
		sem = make(chan struct{}, debugCfg.MaxConcurrentTraceCalls)
	}

	embeddedDebugAPI := &DebugAPI{
		tracersAPI:         tracersAPI,
		tmClient:           tmClient,
		keeper:             k,
		ctxProvider:        ctxProvider,
		txConfigProvider:   txConfigProvider,
		connectionType:     connectionType,
		traceCallSemaphore: sem,
		maxBlockLookback:   debugCfg.MaxTraceLookbackBlocks,
		traceTimeout:       debugCfg.TraceTimeout,
		backend:            backend,
	}

	return &SeiDebugAPI{
		DebugAPI: embeddedDebugAPI,
	}
}

func (api *DebugAPI) TraceTransaction(ctx context.Context, hash common.Hash, config *tracers.TraceConfig) (interface{}, error) {
	release := api.acquireTraceSemaphore()
	defer release()

	ctx, cancel := context.WithTimeout(ctx, api.traceTimeout)
	defer cancel()

	receipt, err := api.keeper.GetReceipt(api.ctxProvider(LatestCtxHeight), hash)
	if err != nil {
		return nil, &TraceError{Code: ErrCodeTxNotFound, Message: err.Error()}
	}
	if err := ValidateBlockAccess(receipt.BlockNumber, api.getBlockValidationParams()); err != nil {
		return nil, err
	}

	startTime := time.Now()
	defer recordMetricsWithError("debug_traceTransaction", api.connectionType, startTime, err)

	return api.tracersAPI.TraceTransaction(ctx, hash, config)
}

func (api *SeiDebugAPI) TraceBlockByNumberExcludeTraceFail(ctx context.Context, number rpc.BlockNumber, config *tracers.TraceConfig) (interface{}, error) {
	release := api.acquireTraceSemaphore()
	defer release()

	ctx, cancel := context.WithTimeout(ctx, api.traceTimeout)
	defer cancel()

	if err := ValidateBlockNumberAccess(number, api.getBlockValidationParams()); err != nil {
		return nil, err
	}

	startTime := time.Now()
	defer recordMetricsWithError("sei_traceBlockByNumberExcludeTraceFail", api.connectionType, startTime, nil)

	result, err := api.DebugAPI.tracersAPI.TraceBlockByNumber(ctx, number, config)
	if err != nil {
		return nil, err
	}
	traces := result.([]*tracers.TxTraceResult)
	finalTraces := make([]*tracers.TxTraceResult, 0, len(traces))
	for _, trace := range traces {
		if trace.Error == "" {
			finalTraces = append(finalTraces, trace)
		}
	}
	return finalTraces, nil
}

func (api *SeiDebugAPI) TraceBlockByHashExcludeTraceFail(ctx context.Context, hash common.Hash, config *tracers.TraceConfig) (interface{}, error) {
	release := api.acquireTraceSemaphore()
	defer release()

	ctx, cancel := context.WithTimeout(ctx, api.traceTimeout)
	defer cancel()

	if err := ValidateBlockHashAccess(ctx, api.tmClient, hash, api.getBlockValidationParams()); err != nil {
		return nil, err
	}

	startTime := time.Now()
	defer recordMetricsWithError("sei_traceBlockByHashExcludeTraceFail", api.connectionType, startTime, nil)

	result, err := api.DebugAPI.tracersAPI.TraceBlockByHash(ctx, hash, config)
	if err != nil {
		return nil, err
	}
	traces := result.([]*tracers.TxTraceResult)
	finalTraces := make([]*tracers.TxTraceResult, 0, len(traces))
	for _, trace := range traces {
		if trace.Error == "" {
			finalTraces = append(finalTraces, trace)
		}
	}
	return finalTraces, nil
}

func (api *DebugAPI) TraceBlockByNumber(ctx context.Context, number rpc.BlockNumber, config *tracers.TraceConfig) (interface{}, error) {
	release := api.acquireTraceSemaphore()
	defer release()

	ctx, cancel := context.WithTimeout(ctx, api.traceTimeout)
	defer cancel()

	if err := ValidateBlockNumberAccess(number, api.getBlockValidationParams()); err != nil {
		return nil, err
	}

	startTime := time.Now()
	defer recordMetricsWithError("debug_traceBlockByNumber", api.connectionType, startTime, nil)

	return api.tracersAPI.TraceBlockByNumber(ctx, number, config)
}

func (api *DebugAPI) TraceBlockByHash(ctx context.Context, hash common.Hash, config *tracers.TraceConfig) (interface{}, error) {
	release := api.acquireTraceSemaphore()
	defer release()

	ctx, cancel := context.WithTimeout(ctx, api.traceTimeout)
	defer cancel()

	if err := ValidateBlockHashAccess(ctx, api.tmClient, hash, api.getBlockValidationParams()); err != nil {
		return nil, err
	}

	startTime := time.Now()
	defer recordMetricsWithError("debug_traceBlockByHash", api.connectionType, startTime, nil)

	return api.tracersAPI.TraceBlockByHash(ctx, hash, config)
}

func (api *DebugAPI) TraceCall(ctx context.Context, args export.TransactionArgs, blockNrOrHash rpc.BlockNumberOrHash, config *tracers.TraceCallConfig) (interface{}, error) {
	release := api.acquireTraceSemaphore()
	defer release()

	ctx, cancel := context.WithTimeout(ctx, api.traceTimeout)
	defer cancel()

	startTime := time.Now()
	defer recordMetricsWithError("debug_traceCall", api.connectionType, startTime, nil)

	return api.tracersAPI.TraceCall(ctx, args, blockNrOrHash, config)
}

type StateAccessResponse struct {
	AppState        json.RawMessage `json:"app"`
	TendermintState json.RawMessage `json:"tendermint"`
	Receipt         json.RawMessage `json:"receipt"`
}

func (api *DebugAPI) TraceStateAccess(ctx context.Context, hash common.Hash) (interface{}, error) {
	defer func() {
		if r := recover(); r != nil {
			debug.PrintStack()
			panic(fmt.Errorf("panic occurred: %v", r))
		}
	}()

	tendermintTraces := &TendermintTraces{Traces: []TendermintTrace{}}
	ctx = WithTendermintTraces(ctx, tendermintTraces)
	receiptTraces := &ReceiptTraces{Traces: []RawResponseReceipt{}}
	ctx = WithReceiptTraces(ctx, receiptTraces)

	_, tx, blockHash, blockNumber, index, err := api.backend.GetTransaction(ctx, hash)
	if err != nil {
		return nil, err
	}
	if tx == nil || blockNumber == 0 {
		return nil, errors.New("invalid transaction")
	}
	block, _, err := api.backend.BlockByHash(ctx, blockHash)
	if err != nil {
		return nil, err
	}
	stateDB, _, err := api.backend.ReplayTransactionTillIndex(ctx, block, int(index))
	if err != nil {
		return nil, err
	}

	return StateAccessResponse{
		AppState:        state.GetDBImpl(stateDB).Ctx().StoreTracer().DerivePrestateToJson(),
		TendermintState: tendermintTraces.MustMarshalToJson(),
		Receipt:         receiptTraces.MustMarshalToJson(),
	}, nil
}
