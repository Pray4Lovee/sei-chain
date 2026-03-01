package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"

	"github.com/sei-protocol/sei-chain/x402/internal/ledger"
)

type Server struct {
	Ledger *ledger.Ledger
	Log    zerolog.Logger
}

func (s *Server) Router() http.Handler {
	r := mux.NewRouter()
	r.HandleFunc("/healthz", s.healthz).Methods(http.MethodGet)
	r.HandleFunc("/payouts/{id}", s.getPayout).Methods(http.MethodGet)
	r.HandleFunc("/payouts", s.listPayouts).Methods(http.MethodGet)
	r.Handle("/metrics", promhttp.Handler())
	return r
}

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	if err := s.Ledger.Health(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func (s *Server) getPayout(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	p, err := s.Ledger.GetPayout(r.Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, p)
}

func (s *Server) listPayouts(w http.ResponseWriter, r *http.Request) {
	p, err := s.Ledger.ListRecent(r.Context(), 100)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, p)
}

func respondJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
