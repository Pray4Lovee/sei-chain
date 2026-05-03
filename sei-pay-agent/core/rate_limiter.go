package core

import (
	"sync"
	"time"
)

type RateLimiter struct {
	interval time.Duration
	last     time.Time
	mu       sync.Mutex
}

func NewRateLimiter(maxTPS int) *RateLimiter {
	if maxTPS <= 0 {
		maxTPS = 1
	}
	return &RateLimiter{interval: time.Second / time.Duration(maxTPS)}
}

func (r *RateLimiter) Wait() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	if !r.last.IsZero() {
		elapsed := now.Sub(r.last)
		if elapsed < r.interval {
			time.Sleep(r.interval - elapsed)
		}
	}
	r.last = time.Now()
}
