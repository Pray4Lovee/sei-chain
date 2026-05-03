package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

type Status string

const (
	StatusAuthorized   Status = "authorized"
	StatusSigning      Status = "signing"
	StatusBroadcasting Status = "broadcasting"
	StatusConfirmed    Status = "confirmed"
	StatusFinalized    Status = "finalized"
	StatusFailed       Status = "failed"
)

type Payout struct {
	ID        string  `json:"id"`
	ToAddr    string  `json:"to"`
	AmountWei string  `json:"amount_wei"`
	Status    Status  `json:"status"`
	Nonce     *uint64 `json:"nonce,omitempty"`
	TxHash    *string `json:"tx_hash,omitempty"`
	Error     *string `json:"error,omitempty"`
}

type SigningJob struct {
	ID        string
	To        common.Address
	AmountWei *big.Int
	Nonce     uint64
}

type Ledger struct{ db *sql.DB }

func New(db *sql.DB) *Ledger { return &Ledger{db: db} }

func (l *Ledger) InsertAuthorized(ctx context.Context, id, toAddr string, amountWei *big.Int) error {
	_, err := l.db.ExecContext(ctx, `INSERT INTO payouts(id,to_addr,amount_wei,status) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING`, id, toAddr, amountWei.String(), StatusAuthorized)
	return err
}

func (l *Ledger) ReserveSigningJob(ctx context.Context, chainID int64) (*SigningJob, error) {
	tx, err := l.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx, `SELECT id,to_addr,amount_wei FROM payouts WHERE status=? ORDER BY authorized_at ASC LIMIT 1`, StatusAuthorized)
	var id, to, amount string
	if err := row.Scan(&id, &to, &amount); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	nonce, err := l.reserveNonceTx(ctx, tx, chainID)
	if err != nil {
		return nil, err
	}

	res, err := tx.ExecContext(ctx, `UPDATE payouts SET status=?, nonce=?, signed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?`, StatusSigning, nonce, id, StatusAuthorized)
	if err != nil {
		return nil, err
	}
	if affected, _ := res.RowsAffected(); affected != 1 {
		return nil, fmt.Errorf("failed transition authorized->signing")
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	amt := new(big.Int)
	if _, ok := amt.SetString(amount, 10); !ok {
		return nil, fmt.Errorf("invalid amount %q", amount)
	}
	return &SigningJob{ID: id, To: common.HexToAddress(to), AmountWei: amt, Nonce: nonce}, nil
}

func (l *Ledger) reserveNonceTx(ctx context.Context, tx *sql.Tx, chainID int64) (uint64, error) {
	_, err := tx.ExecContext(ctx, `INSERT INTO nonces(chain_id,next_nonce) VALUES(?,0) ON CONFLICT(chain_id) DO NOTHING`, chainID)
	if err != nil {
		return 0, err
	}
	row := tx.QueryRowContext(ctx, `SELECT next_nonce FROM nonces WHERE chain_id=?`, chainID)
	var nonce uint64
	if err := row.Scan(&nonce); err != nil {
		return 0, err
	}
	_, err = tx.ExecContext(ctx, `UPDATE nonces SET next_nonce=? WHERE chain_id=?`, nonce+1, chainID)
	return nonce, err
}

func (l *Ledger) MarkBroadcasting(ctx context.Context, id, txHash string) error {
	res, err := l.db.ExecContext(ctx, `UPDATE payouts SET status=?, tx_hash=?, broadcast_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?`, StatusBroadcasting, txHash, id, StatusSigning)
	if err != nil {
		return err
	}
	if affected, _ := res.RowsAffected(); affected != 1 {
		return fmt.Errorf("failed transition signing->broadcasting")
	}
	return nil
}

func (l *Ledger) MarkFailed(ctx context.Context, id string, errMsg error) error {
	_, err := l.db.ExecContext(ctx, `UPDATE payouts SET status=?, error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN (?,?,?)`, StatusFailed, errMsg.Error(), id, StatusAuthorized, StatusSigning, StatusBroadcasting)
	return err
}

func (l *Ledger) MarkConfirmed(ctx context.Context, id string, blockNumber uint64) error {
	_, err := l.db.ExecContext(ctx, `UPDATE payouts SET status=?, block_number=?, confirmed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?`, StatusConfirmed, blockNumber, id, StatusBroadcasting)
	return err
}

func (l *Ledger) MarkFinalized(ctx context.Context, id string) error {
	_, err := l.db.ExecContext(ctx, `UPDATE payouts SET status=?, finalized_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?`, StatusFinalized, id, StatusConfirmed)
	return err
}

type BroadcastingPayout struct {
	ID          string
	TxHash      common.Hash
	BlockNumber *uint64
}

func (l *Ledger) ListBroadcasting(ctx context.Context, limit int) ([]BroadcastingPayout, error) {
	rows, err := l.db.QueryContext(ctx, `SELECT id,tx_hash,block_number FROM payouts WHERE status IN (?,?) LIMIT ?`, StatusBroadcasting, StatusConfirmed, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]BroadcastingPayout, 0, limit)
	for rows.Next() {
		var p BroadcastingPayout
		var txHash string
		var block sql.NullInt64
		if err := rows.Scan(&p.ID, &txHash, &block); err != nil {
			return nil, err
		}
		p.TxHash = common.HexToHash(txHash)
		if block.Valid {
			bn := uint64(block.Int64)
			p.BlockNumber = &bn
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (l *Ledger) GetPayout(ctx context.Context, id string) (*Payout, error) {
	row := l.db.QueryRowContext(ctx, `SELECT id,to_addr,amount_wei,status,nonce,tx_hash,error_message FROM payouts WHERE id=?`, id)
	p := &Payout{}
	var nonce sql.NullInt64
	var txHash sql.NullString
	var errMsg sql.NullString
	if err := row.Scan(&p.ID, &p.ToAddr, &p.AmountWei, &p.Status, &nonce, &txHash, &errMsg); err != nil {
		return nil, err
	}
	if nonce.Valid {
		n := uint64(nonce.Int64)
		p.Nonce = &n
	}
	if txHash.Valid {
		p.TxHash = &txHash.String
	}
	if errMsg.Valid {
		p.Error = &errMsg.String
	}
	return p, nil
}

func (l *Ledger) ListRecent(ctx context.Context, limit int) ([]Payout, error) {
	rows, err := l.db.QueryContext(ctx, `SELECT id,to_addr,amount_wei,status,nonce,tx_hash,error_message FROM payouts ORDER BY authorized_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Payout{}
	for rows.Next() {
		var p Payout
		var nonce sql.NullInt64
		var txHash sql.NullString
		var errMsg sql.NullString
		if err := rows.Scan(&p.ID, &p.ToAddr, &p.AmountWei, &p.Status, &nonce, &txHash, &errMsg); err != nil {
			return nil, err
		}
		if nonce.Valid {
			n := uint64(nonce.Int64)
			p.Nonce = &n
		}
		if txHash.Valid {
			p.TxHash = &txHash.String
		}
		if errMsg.Valid {
			p.Error = &errMsg.String
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (l *Ledger) Health(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return l.db.PingContext(ctx)
}
