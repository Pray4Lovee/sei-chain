package main

import (
	"context"
	"database/sql"
	"errors"
	"math/big"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	_ "github.com/mattn/go-sqlite3"

	"github.com/sei-protocol/sei-chain/x402/internal/api"
	"github.com/sei-protocol/sei-chain/x402/internal/config"
	"github.com/sei-protocol/sei-chain/x402/internal/confirmer"
	"github.com/sei-protocol/sei-chain/x402/internal/ledger"
	"github.com/sei-protocol/sei-chain/x402/internal/listener"
	"github.com/sei-protocol/sei-chain/x402/internal/logger"
	"github.com/sei-protocol/sei-chain/x402/internal/metrics"
	"github.com/sei-protocol/sei-chain/x402/internal/signer"
	"github.com/sei-protocol/sei-chain/x402/migrations"
)

func main() {
	log := logger.New()
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("invalid config")
	}

	db, err := openDB(cfg.DBPath)
	if err != nil {
		log.Fatal().Err(err).Msg("db open failed")
	}
	defer db.Close()
	if err := migrations.Apply(db); err != nil {
		log.Fatal().Err(err).Msg("migration failed")
	}

	l := ledger.New(db)
	m := metrics.New()

	httpClient, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		log.Fatal().Err(err).Msg("rpc dial failed")
	}
	defer httpClient.Close()

	wsClient, err := ethclient.Dial(cfg.WSURL)
	if err != nil {
		log.Fatal().Err(err).Msg("ws dial failed")
	}
	defer wsClient.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	lis := &listener.Listener{Client: wsClient, Ledger: l, Contract: common.HexToAddress(cfg.PayoutContract), Log: log, Metrics: m}
	sig := &signer.Worker{Client: httpClient, Ledger: l, Contract: common.HexToAddress(cfg.SettlementContract), PrivateKeyHex: cfg.SettlementPrivateKey, ChainID: bigInt(cfg.ChainID), Interval: cfg.SignerInterval, GasTipCapGwei: cfg.GasTipCapGwei, MaxFeeCapWei: cfg.MaxFeeCapWei, Log: log, Metrics: m}
	conf := &confirmer.Worker{Client: httpClient, Ledger: l, Confirmations: cfg.Confirmations, Interval: cfg.ConfirmerInterval, Log: log, Metrics: m}

	go func() {
		for {
			err := lis.Run(ctx)
			if err == nil || errors.Is(err, context.Canceled) {
				return
			}
			log.Error().Err(err).Msg("listener crashed, retrying")
			select {
			case <-ctx.Done():
				return
			case <-time.After(cfg.PollInterval):
			}
		}
	}()
	go sig.Run(ctx)
	go conf.Run(ctx)

	srv := &http.Server{Addr: cfg.ListenAddr, Handler: (&api.Server{Ledger: l, Log: log}).Router()}
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("http server crashed")
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Info().Msg("shutdown complete")
}

func openDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", path+"?_foreign_keys=on&_journal_mode=WAL&_synchronous=FULL")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;`); err != nil {
		return nil, err
	}
	return db, nil
}

func bigInt(v int64) *big.Int {
	return new(big.Int).SetInt64(v)
}
