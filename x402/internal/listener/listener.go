package listener

import (
	"context"
	"encoding/hex"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/rs/zerolog"

	"github.com/sei-protocol/sei-chain/x402/internal/ledger"
	"github.com/sei-protocol/sei-chain/x402/internal/metrics"
)

type Listener struct {
	Client   *ethclient.Client
	Ledger   *ledger.Ledger
	Contract common.Address
	Log      zerolog.Logger
	Metrics  *metrics.Metrics
}

func (l *Listener) Run(ctx context.Context) error {
	query := ethereum.FilterQuery{Addresses: []common.Address{l.Contract}}
	logs := make(chan types.Log)
	sub, err := l.Client.SubscribeFilterLogs(ctx, query, logs)
	if err != nil {
		return err
	}
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case err := <-sub.Err():
			return err
		case ev := <-logs:
			if len(ev.Topics) < 3 {
				continue
			}
			payoutID := hex.EncodeToString(ev.Topics[1].Bytes())
			to := common.HexToAddress(ev.Topics[2].Hex()).Hex()
			amount := new(big.Int).SetBytes(ev.Data)
			if err := l.Ledger.InsertAuthorized(ctx, payoutID, to, amount); err != nil {
				l.Log.Error().Err(err).Str("payout_id", payoutID).Msg("insert authorized failed")
				continue
			}
			l.Metrics.PayoutAuthorized.Inc()
			l.Log.Info().Str("payout_id", payoutID).Str("to", to).Str("amount", amount.String()).Msg("authorized payout indexed")
		}
	}
}
