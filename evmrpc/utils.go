const LatestCtxHeight int64 = -1

type BlockValidationParams struct {
	LatestHeight     int64
	MaxBlockLookback int64
	EarliestVersion  int64
}

func ValidateBlockAccess(blockNumber int64, params BlockValidationParams) error {
	if params.MaxBlockLookback >= 0 && blockNumber < params.LatestHeight-params.MaxBlockLookback {
		metrics.SafeTelemetryIncrCounterWithLabels(
			[]string{"sei", "evmrpc", "trace", "rejected"},
			1,
			[]metrics.Label{telemetry.NewLabel("reason", "lookback")},
		)
		return &TraceError{
			Code:    ErrCodeBlockTooOld,
			Message: fmt.Sprintf("block number %d is beyond max lookback of %d", blockNumber, params.MaxBlockLookback),
			Height:  blockNumber,
		}
	}
	if params.EarliestVersion > 0 && blockNumber < params.EarliestVersion {
		metrics.SafeTelemetryIncrCounterWithLabels(
			[]string{"sei", "evmrpc", "trace", "rejected"},
			1,
			[]metrics.Label{telemetry.NewLabel("reason", "pruned")},
		)
		return &TraceError{
			Code:    ErrCodeBlockPruned,
			Message: fmt.Sprintf("block number %d is earlier than base %d", blockNumber, params.EarliestVersion),
			Height:  blockNumber,
			Base:    params.EarliestVersion,
		}
	}
	return nil
}

func ValidateBlockNumberAccess(number rpc.BlockNumber, params BlockValidationParams) error {
	switch number {
	case rpc.LatestBlockNumber, rpc.FinalizedBlockNumber:
		return nil
	default:
		return ValidateBlockAccess(number.Int64(), params)
	}
}

func ValidateBlockHashAccess(ctx context.Context, tmClient rpcclient.Client, hash common.Hash, params BlockValidationParams) error {
	res, err := blockByHash(ctx, tmClient, hash[:])
	if err != nil {
		return &TraceError{Code: ErrCodeBlockHashNotFound, Message: err.Error()}
	}
	if res.Block == nil {
		return &TraceError{Code: ErrCodeBlockHashNotFound, Message: fmt.Sprintf("block hash %s not found", hash.Hex())}
	}
	return ValidateBlockAccess(res.Block.Height, params)
}

// GetBlockNumberByNrOrHash returns the height of the block with the given number or hash.
func GetBlockNumberByNrOrHash(ctx context.Context, tmClient rpcclient.Client, blockNrOrHash rpc.BlockNumberOrHash) (*int64, error) {
	if blockNrOrHash.BlockHash != nil {
		res, err := blockByHash(ctx, tmClient, blockNrOrHash.BlockHash[:])
		if err != nil {
			return nil, err
		}
		return &res.Block.Height, nil
	}
	return getBlockNumber(ctx, tmClient, *blockNrOrHash.BlockNumber)
}
