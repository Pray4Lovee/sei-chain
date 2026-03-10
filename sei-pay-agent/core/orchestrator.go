package core

import "fmt"

type PaymentOrchestrator struct {
	identity     *IdentityResolver
	intents      *IntentEngine
	audit        *AuditLog
	rateLimiter  *RateLimiter
	executor     TxExecutor
	stressMode   bool
	stressBurst  int
	enforceOwner bool
	source       string
}

func NewPaymentOrchestrator(source string, identity *IdentityResolver, intents *IntentEngine, audit *AuditLog, limiter *RateLimiter, executor TxExecutor, stressMode bool, stressBurst int, enforceOwner bool) *PaymentOrchestrator {
	return &PaymentOrchestrator{
		identity: identity, intents: intents, audit: audit, rateLimiter: limiter, executor: executor,
		stressMode: stressMode, stressBurst: stressBurst, enforceOwner: enforceOwner, source: source,
	}
}

func (o *PaymentOrchestrator) Bind(actor, username, address string) (string, string, error) {
	u, a, err := o.identity.Bind(username, address)
	if err != nil {
		return "", "", err
	}
	o.audit.Record("identity.bind", actor, map[string]any{"source": o.source, "username": u, "address": a})
	return u, a, nil
}

func (o *PaymentOrchestrator) CreateIntent(actor, target string, amount float64) (Intent, error) {
	var (
		addr string
		err  error
		user string
	)
	if len(target) > 0 && target[0] == '@' {
		user, err = NormalizeUsername(target)
		if err != nil {
			return Intent{}, err
		}
		addr, err = o.identity.Resolve(user)
	} else {
		addr, err = ValidateAddress(target)
	}
	if err != nil {
		return Intent{}, err
	}
	intent, err := o.intents.Create(o.source, actor, user, addr, amount)
	if err != nil {
		return Intent{}, err
	}
	o.audit.Record("intent.created", actor, map[string]any{"source": o.source, "intent_id": intent.IntentID, "address": addr, "amount": amount})
	return intent, nil
}

func (o *PaymentOrchestrator) ConfirmIntent(actor, intentID string) (string, error) {
	intent, err := o.intents.Fetch(intentID)
	if err != nil {
		return "", err
	}
	if o.enforceOwner && intent.RequesterID != actor {
		return "", fmt.Errorf("requester mismatch")
	}
	if intent.Status != StatusPending {
		return "", fmt.Errorf("intent already finalized")
	}
	o.rateLimiter.Wait()

	var txHash string
	if o.stressMode {
		hashes, err := RunStressBatch(o.executor, intent.Address, intent.AmountSEI, o.stressBurst)
		if err != nil {
			_ = o.intents.MarkFailed(intentID)
			return "", err
		}
		txHash = hashes[len(hashes)-1]
	} else {
		txHash, err = o.executor.ExecuteTransaction(intent.Address, intent.AmountSEI)
		if err != nil {
			_ = o.intents.MarkFailed(intentID)
			return "", err
		}
	}
	if err := o.intents.MarkExecuted(intentID, txHash); err != nil {
		return "", err
	}
	o.audit.Record("intent.executed", actor, map[string]any{"source": o.source, "intent_id": intentID, "tx_hash": txHash})
	return txHash, nil
}
