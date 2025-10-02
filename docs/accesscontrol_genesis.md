# Access Control Genesis Support

The `accesscontrol` module now includes full genesis lifecycle support so that
parallel execution guarantees can be established from the moment the chain is
bootstrapped. The following capabilities are available:

- `DefaultGenesis()` – provides an empty baseline state that can be extended by
  downstream applications.
- `ValidateGenesis(...)` – ensures each mapping entry is well-formed before the
  chain accepts it.
- `InitGenesis(...)` – hydrates the access-control dependency DAG in the keeper
  during chain initialization.
- `ExportGenesis(...)` – serializes the current set of `access/` mappings back
  into genesis-compatible JSON.

## Example Genesis Payload

```json
{
  "mappings": [
    {
      "msg_key": "bank/MsgSend",
      "ops": [
        { "type": 1, "resource_id": "bank/%s" },
        { "type": 2, "resource_id": "bank/%s" }
      ]
    },
    {
      "msg_key": "staking/MsgDelegate",
      "ops": [
        { "type": 1, "resource_id": "stake/%s" },
        { "type": 2, "resource_id": "stake/%s" }
      ]
    }
  ]
}
```

With these hooks in place, the dependency DAG can be primed at genesis and kept
in sync across validators without a governance upgrade pathway.
