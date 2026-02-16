package keeper

import (
	"context"
	"errors"
	"fmt"

	"github.com/sei-protocol/sei-chain/x/dap/zk"
)

var (
	ErrNilGuard    = errors.New("dap pipeline guard verifier is nil")
	ErrNilOrigin   = errors.New("dap pipeline origin resolver is nil")
	ErrNilSignal   = errors.New("dap pipeline signal synchronizer is nil")
	ErrNilSoul     = errors.New("dap pipeline soul locker is nil")
	ErrNilZKSealer = errors.New("dap pipeline zk sealer is nil")
	ErrEmptyActor  = errors.New("dap pipeline actor is empty")
)

// GuardVerifier checks transition authenticity.
type GuardVerifier interface {
	Guard(ctx context.Context, actor string, extrinsic []byte) error
}

// OriginResolver resolves request provenance.
type OriginResolver interface {
	Resolve(ctx context.Context, actor string) error
}

// SignalSynchronizer emits non-blocking governance signal sync.
type SignalSynchronizer interface {
	Sync(ctx context.Context, actor string) error
}

// SoulLocker applies spoof-prevention entropy lock semantics.
type SoulLocker interface {
	Lock(ctx context.Context, actor string) error
}

// ZKSealer stores or relays proof artifacts.
type ZKSealer interface {
	Seal(ctx context.Context, actor string, receipt [32]byte) error
}

// Pipeline orchestrates DAP flow for a single transaction envelope.
type Pipeline struct {
	guard  GuardVerifier
	origin OriginResolver
	signal SignalSynchronizer
	soul   SoulLocker
	zk     ZKSealer
}

func NewPipeline(
	guard GuardVerifier,
	origin OriginResolver,
	signal SignalSynchronizer,
	soul SoulLocker,
	zkSealer ZKSealer,
) (Pipeline, error) {
	if guard == nil {
		return Pipeline{}, ErrNilGuard
	}
	if origin == nil {
		return Pipeline{}, ErrNilOrigin
	}
	if signal == nil {
		return Pipeline{}, ErrNilSignal
	}
	if soul == nil {
		return Pipeline{}, ErrNilSoul
	}
	if zkSealer == nil {
		return Pipeline{}, ErrNilZKSealer
	}

	return Pipeline{guard: guard, origin: origin, signal: signal, soul: soul, zk: zkSealer}, nil
}

// Execute runs the DAP sequence and returns a deterministic receipt hash.
func (p Pipeline) Execute(ctx context.Context, actor string, extrinsic, preState, postState []byte) ([32]byte, error) {
	if actor == "" {
		return [32]byte{}, ErrEmptyActor
	}

	if err := p.guard.Guard(ctx, actor, extrinsic); err != nil {
		return [32]byte{}, fmt.Errorf("guard verification failed: %w", err)
	}
	if err := p.origin.Resolve(ctx, actor); err != nil {
		return [32]byte{}, fmt.Errorf("origin resolution failed: %w", err)
	}
	if err := p.signal.Sync(ctx, actor); err != nil {
		return [32]byte{}, fmt.Errorf("signal synchronization failed: %w", err)
	}
	if err := p.soul.Lock(ctx, actor); err != nil {
		return [32]byte{}, fmt.Errorf("soul lock failed: %w", err)
	}

	receipt := zk.GenerateReceiptHash(extrinsic, preState, postState)
	if err := p.zk.Seal(ctx, actor, receipt); err != nil {
		return [32]byte{}, fmt.Errorf("zk seal failed: %w", err)
	}

	return receipt, nil
}
