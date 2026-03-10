package storage

import (
	"fmt"
	"sync"
	"time"

	core "github.com/sei-protocol/sei-chain/sei-pay-agent/core"
)

type Database struct {
	mu       sync.RWMutex
	bindings map[string]core.Binding
	intents  map[string]core.Intent
	audit    []core.AuditEntry
	nextID   int64
}

func NewDatabase() *Database {
	return &Database{
		bindings: map[string]core.Binding{},
		intents:  map[string]core.Intent{},
		audit:    make([]core.AuditEntry, 0, 128),
		nextID:   1,
	}
}

func (d *Database) Bind(username, address string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.bindings[username] = core.Binding{Username: username, Address: address, CreatedAt: time.Now().UTC()}
}

func (d *Database) Resolve(username string) (string, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	v, ok := d.bindings[username]
	if !ok {
		return "", fmt.Errorf("username not bound")
	}
	return v.Address, nil
}

func (d *Database) CreateIntent(intent core.Intent) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.intents[intent.IntentID] = intent
}

func (d *Database) GetIntent(intentID string) (core.Intent, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	it, ok := d.intents[intentID]
	if !ok {
		return core.Intent{}, fmt.Errorf("intent not found")
	}
	return it, nil
}

func (d *Database) UpdateIntent(intent core.Intent) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if _, ok := d.intents[intent.IntentID]; !ok {
		return fmt.Errorf("intent not found")
	}
	d.intents[intent.IntentID] = intent
	return nil
}

func (d *Database) AddAudit(eventType, actor, payload string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.audit = append(d.audit, core.AuditEntry{ID: d.nextID, EventType: eventType, Actor: actor, Payload: payload, CreatedAt: time.Now().UTC()})
	d.nextID++
}

func (d *Database) AuditCount() int {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return len(d.audit)
}
