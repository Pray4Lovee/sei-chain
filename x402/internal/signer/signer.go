package signer

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/rs/zerolog"

	"github.com/sei-protocol/sei-chain/x402/internal/ledger"
	"github.com/sei-protocol/sei-chain/x402/internal/metrics"
)

type Worker struct {
	Client        *ethclient.Client
	Ledger        *ledger.Ledger
	Contract      common.Address
	PrivateKeyHex string
	ChainID       *big.Int
	Interval      time.Duration
	GasTipCapGwei int64
	MaxFeeCapWei  int64
	Log           zerolog.Logger
	Metrics       *metrics.Metrics
}

func (w *Worker) Run(ctx context.Context) {
	pk, err := crypto.HexToECDSA(trim0x(w.PrivateKeyHex))
	if err != nil {
		w.Log.Fatal().Err(err).Msg("invalid private key")
	}
	ticker := time.NewTicker(w.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			start := time.Now()
			if err := w.tick(ctx, pk); err != nil && !errors.Is(err, context.Canceled) {
				w.Log.Error().Err(err).Msg("signer tick failed")
			}
			w.Metrics.SignerLatency.Observe(time.Since(start).Seconds())
		}
	}
}

func (w *Worker) tick(ctx context.Context, pk *ecdsa.PrivateKey) error {
	job, err := w.Ledger.ReserveSigningJob(ctx, w.ChainID.Int64())
	if err != nil || job == nil {
		return err
	}

	header, err := w.Client.HeaderByNumber(ctx, nil)
	if err != nil {
		_ = w.Ledger.MarkFailed(ctx, job.ID, err)
		w.Metrics.PayoutFailed.Inc()
		return err
	}

	baseFee := header.BaseFee
	if baseFee == nil {
		baseFee = big.NewInt(0)
	}
	maxFee := new(big.Int).Mul(baseFee, big.NewInt(2))
	if maxFee.Cmp(big.NewInt(w.MaxFeeCapWei)) > 0 {
		maxFee = big.NewInt(w.MaxFeeCapWei)
	}
	tipCap := new(big.Int).Mul(big.NewInt(w.GasTipCapGwei), big.NewInt(1_000_000_000))
	gasLimit := uint64(21000)

	tx := types.NewTx(&types.DynamicFeeTx{
		ChainID:   w.ChainID,
		Nonce:     job.Nonce,
		GasTipCap: tipCap,
		GasFeeCap: maxFee,
		Gas:       gasLimit,
		To:        &job.To,
		Value:     job.AmountWei,
		Data:      nil,
	})

	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(w.ChainID), pk)
	if err != nil {
		_ = w.Ledger.MarkFailed(ctx, job.ID, err)
		w.Metrics.PayoutFailed.Inc()
		return err
	}

	if err := w.Client.SendTransaction(ctx, signedTx); err != nil {
		_ = w.Ledger.MarkFailed(ctx, job.ID, err)
		w.Metrics.PayoutFailed.Inc()
		return err
	}

	if err := w.Ledger.MarkBroadcasting(ctx, job.ID, signedTx.Hash().Hex()); err != nil {
		w.Log.Error().Err(err).Str("payout_id", job.ID).Msg("failed transition to broadcasting")
		return err
	}

	w.Metrics.PayoutSigned.Inc()
	w.Metrics.PayoutBroadcast.Inc()
	w.Log.Info().Str("payout_id", job.ID).Str("tx_hash", signedTx.Hash().Hex()).Uint64("nonce", job.Nonce).Msg("signed + broadcast payout")
	return nil
}

func trim0x(v string) string {
	if len(v) > 1 && v[:2] == "0x" {
		return v[2:]
	}
	return v
}
