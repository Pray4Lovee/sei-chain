package evmrpc

import "fmt"

const (
	ErrCodeBlockTooOld       = "ERR_BLOCK_TOO_OLD"
	ErrCodeBlockPruned       = "ERR_BLOCK_PRUNED"
	ErrCodeTxNotFound        = "ERR_TX_NOT_FOUND"
	ErrCodeBlockHashNotFound = "ERR_BLOCK_HASH_NOT_FOUND"
)

type TraceError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Height  int64  `json:"height,omitempty"`
	Base    int64  `json:"base,omitempty"`
}

func (e *TraceError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}
