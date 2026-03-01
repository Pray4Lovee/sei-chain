package metrics

import "github.com/prometheus/client_golang/prometheus"

type Metrics struct {
	PayoutAuthorized prometheus.Counter
	PayoutSigned     prometheus.Counter
	PayoutBroadcast  prometheus.Counter
	PayoutFinalized  prometheus.Counter
	PayoutFailed     prometheus.Counter
	SignerLatency    prometheus.Histogram
	ConfirmLatency   prometheus.Histogram
}

func New() *Metrics {
	m := &Metrics{
		PayoutAuthorized: prometheus.NewCounter(prometheus.CounterOpts{Name: "payout_authorized_total", Help: "Total authorized payouts"}),
		PayoutSigned:     prometheus.NewCounter(prometheus.CounterOpts{Name: "payout_signed_total", Help: "Total signed payouts"}),
		PayoutBroadcast:  prometheus.NewCounter(prometheus.CounterOpts{Name: "payout_broadcast_total", Help: "Total broadcast payouts"}),
		PayoutFinalized:  prometheus.NewCounter(prometheus.CounterOpts{Name: "payout_finalized_total", Help: "Total finalized payouts"}),
		PayoutFailed:     prometheus.NewCounter(prometheus.CounterOpts{Name: "payout_failed_total", Help: "Total failed payouts"}),
		SignerLatency:    prometheus.NewHistogram(prometheus.HistogramOpts{Name: "signer_latency_seconds", Help: "Signer loop latency"}),
		ConfirmLatency:   prometheus.NewHistogram(prometheus.HistogramOpts{Name: "confirm_latency_seconds", Help: "Confirmer loop latency"}),
	}
	prometheus.MustRegister(m.PayoutAuthorized, m.PayoutSigned, m.PayoutBroadcast, m.PayoutFinalized, m.PayoutFailed, m.SignerLatency, m.ConfirmLatency)
	return m
}
