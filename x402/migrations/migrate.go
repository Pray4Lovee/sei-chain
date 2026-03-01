package migrations

import (
	"database/sql"
	_ "embed"
)

//go:embed 001_schema.sql
var schema string

func Apply(db *sql.DB) error {
	_, err := db.Exec(schema)
	return err
}
