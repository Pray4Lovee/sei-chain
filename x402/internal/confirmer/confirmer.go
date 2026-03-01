package confirmer

import (
	"context"
	"errors"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/rs/zerolog"

	"github.com/sei-protocol/sei-chain/x402/internal/ledger"
	"github.com/sei-protocol/sei-chain/x402/internal/metrics"
)

type Worker struct {
	Client        *ethclient.Client
	Ledger        *ledger.Ledger
	Confirmations uint64
	Interval      time.Duration
	Log           zerolog.Logger
	Metrics       *metrics.Metrics
}

func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(w.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			start := time.Now()
			if err := w.tick(ctx); err != nil && !errors.Is(err, context.Canceled) {
				w.Log.Error().Err(err).Msg("confirmer tick failed")
			}
			w.Metrics.ConfirmLatency.Observe(time.Since(start).Seconds())
		}
	}
}

func (w *Worker) tick(ctx context.Context) error {
	head, err := w.Client.BlockNumber(ctx)
	if err != nil {
		return err
	}
	pending, err := w.Ledger.ListBroadcasting(ctx, 100)
	if err != nil {
		return err
	}
	for _, p := range pending {
		receipt, err := w.Client.TransactionReceipt(ctx, p.TxHash)
		if err != nil {
			if errors.Is(err, ethereum.NotFound) {
				continue
			}
			continue
		}
		depth := head - receipt.BlockNumber.Uint64()
		if depth >= w.Confirmations {
			if err := w.Ledger.MarkConfirmed(ctx, p.ID, receipt.BlockNumber.Uint64()); err == nil {
				w.Log.Info().Str("payout_id", p.ID).Msg("marked confirmed")
			}
		}
		if depth >= w.Confirmations+5 {
			if err := w.Ledger.MarkFinalized(ctx, p.ID); err == nil {
				w.Metrics.PayoutFinalized.Inc()
				w.Log.Info().Str("payout_id", p.ID).Msg("marked finalized")
			}
		}
	}
	return nil
}
