package keeper

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
)

type noopGuard struct{ err error }

func (n noopGuard) Guard(_ context.Context, _ string, _ []byte) error { return n.err }

type noopOrigin struct{ err error }

func (n noopOrigin) Resolve(_ context.Context, _ string) error { return n.err }

type noopSignal struct{ err error }

func (n noopSignal) Sync(_ context.Context, _ string) error { return n.err }

type noopSoul struct{ err error }

func (n noopSoul) Lock(_ context.Context, _ string) error { return n.err }

type captureZK struct {
	err     error
	sealed  bool
	receipt [32]byte
}

func (c *captureZK) Seal(_ context.Context, _ string, receipt [32]byte) error {
	if c.err != nil {
		return c.err
	}
	c.sealed = true
	c.receipt = receipt
	return nil
}

type syncCapture struct {
	sealedCount *atomic.Int64
}

func (s syncCapture) Seal(_ context.Context, _ string, _ [32]byte) error {
	s.sealedCount.Add(1)
	return nil
}

func mustPipeline(t *testing.T, guard GuardVerifier, origin OriginResolver, signal SignalSynchronizer, soul SoulLocker, zkSealer ZKSealer) Pipeline {
	t.Helper()
	p, err := NewPipeline(guard, origin, signal, soul, zkSealer)
	if err != nil {
		t.Fatalf("NewPipeline failed: %v", err)
	}
	return p
}

func TestNewPipelineNilDependency(t *testing.T) {
	cases := []struct {
		name     string
		guard    GuardVerifier
		origin   OriginResolver
		signal   SignalSynchronizer
		soul     SoulLocker
		zkSealer ZKSealer
		err      error
	}{
		{name: "nil guard", origin: noopOrigin{}, signal: noopSignal{}, soul: noopSoul{}, zkSealer: &captureZK{}, err: ErrNilGuard},
		{name: "nil origin", guard: noopGuard{}, signal: noopSignal{}, soul: noopSoul{}, zkSealer: &captureZK{}, err: ErrNilOrigin},
		{name: "nil signal", guard: noopGuard{}, origin: noopOrigin{}, soul: noopSoul{}, zkSealer: &captureZK{}, err: ErrNilSignal},
		{name: "nil soul", guard: noopGuard{}, origin: noopOrigin{}, signal: noopSignal{}, zkSealer: &captureZK{}, err: ErrNilSoul},
		{name: "nil zk", guard: noopGuard{}, origin: noopOrigin{}, signal: noopSignal{}, soul: noopSoul{}, err: ErrNilZKSealer},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := NewPipeline(tc.guard, tc.origin, tc.signal, tc.soul, tc.zkSealer)
			if !errors.Is(err, tc.err) {
				t.Fatalf("expected %v, got %v", tc.err, err)
			}
		})
	}
}

func TestPipelineExecuteSuccess(t *testing.T) {
	zkSealer := &captureZK{}
	p := mustPipeline(t, noopGuard{}, noopOrigin{}, noopSignal{}, noopSoul{}, zkSealer)

	receipt, err := p.Execute(context.Background(), "sei1actor", []byte("tx"), []byte("pre"), []byte("post"))
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if !zkSealer.sealed {
		t.Fatal("expected zk receipt to be sealed")
	}
	if zkSealer.receipt != receipt {
		t.Fatal("expected returned receipt to equal sealed receipt")
	}
}

func TestPipelineExecuteRejectsEmptyActor(t *testing.T) {
	p := mustPipeline(t, noopGuard{}, noopOrigin{}, noopSignal{}, noopSoul{}, &captureZK{})

	_, err := p.Execute(context.Background(), "", []byte("tx"), []byte("pre"), []byte("post"))
	if !errors.Is(err, ErrEmptyActor) {
		t.Fatalf("expected empty actor error, got %v", err)
	}
}

func TestPipelineExecuteErrorWrapping(t *testing.T) {
	guardErr := errors.New("guard failed")
	originErr := errors.New("origin failed")
	signalErr := errors.New("signal failed")
	soulErr := errors.New("soul failed")
	zkErr := errors.New("zk failed")

	cases := []struct {
		name       string
		pipeline   Pipeline
		rootErr    error
		wantPrefix string
	}{
		{name: "guard", pipeline: mustPipeline(t, noopGuard{err: guardErr}, noopOrigin{}, noopSignal{}, noopSoul{}, &captureZK{}), rootErr: guardErr, wantPrefix: "guard verification failed"},
		{name: "origin", pipeline: mustPipeline(t, noopGuard{}, noopOrigin{err: originErr}, noopSignal{}, noopSoul{}, &captureZK{}), rootErr: originErr, wantPrefix: "origin resolution failed"},
		{name: "signal", pipeline: mustPipeline(t, noopGuard{}, noopOrigin{}, noopSignal{err: signalErr}, noopSoul{}, &captureZK{}), rootErr: signalErr, wantPrefix: "signal synchronization failed"},
		{name: "soul", pipeline: mustPipeline(t, noopGuard{}, noopOrigin{}, noopSignal{}, noopSoul{err: soulErr}, &captureZK{}), rootErr: soulErr, wantPrefix: "soul lock failed"},
		{name: "zk", pipeline: mustPipeline(t, noopGuard{}, noopOrigin{}, noopSignal{}, noopSoul{}, &captureZK{err: zkErr}), rootErr: zkErr, wantPrefix: "zk seal failed"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := tc.pipeline.Execute(context.Background(), "sei1actor", []byte("tx"), []byte("pre"), []byte("post"))
			if err == nil {
				t.Fatalf("expected an error")
			}
			if !errors.Is(err, tc.rootErr) {
				t.Fatalf("expected wrapped root error %v, got %v", tc.rootErr, err)
			}
			if !strings.HasPrefix(err.Error(), tc.wantPrefix) {
				t.Fatalf("expected prefix %q in error %q", tc.wantPrefix, err)
			}
		})
	}
}

func TestPipelineExecuteStress(t *testing.T) {
	const workers = 64
	const iterationsPerWorker = 200

	sealedCount := &atomic.Int64{}
	p := mustPipeline(t, noopGuard{}, noopOrigin{}, noopSignal{}, noopSoul{}, syncCapture{sealedCount: sealedCount})
	var wg sync.WaitGroup
	wg.Add(workers)

	for worker := 0; worker < workers; worker++ {
		go func(worker int) {
			defer wg.Done()
			for i := 0; i < iterationsPerWorker; i++ {
				actor := fmt.Sprintf("sei1actor%d", worker)
				extrinsic := []byte(fmt.Sprintf("tx-%d-%d", worker, i))
				if _, err := p.Execute(context.Background(), actor, extrinsic, []byte("pre"), []byte("post")); err != nil {
					t.Errorf("unexpected error on worker %d iteration %d: %v", worker, i, err)
					return
				}
			}
		}(worker)
	}

	wg.Wait()
	want := int64(workers * iterationsPerWorker)
	if got := sealedCount.Load(); got != want {
		t.Fatalf("expected %d sealed receipts, got %d", want, got)
	}
}
