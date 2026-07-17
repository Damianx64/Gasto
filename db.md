## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `user_name` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `type` | `transaction_type` |  |
| `color` | `text` |  Nullable |
| `icon_key` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `client_updated_at` | `timestamptz` | Not null, usado para resolver conflictos |
| `last_change_id` | `uuid` | Not null, desempate determinista |
| `deleted_at` | `timestamptz` | Nullable, tombstone de sincronización |

## Table `transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `category_id` | `uuid` |  Nullable |
| `type` | `transaction_type` |  |
| `amount` | `numeric` |  |
| `description` | `text` |  Nullable |
| `transaction_date` | `date` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `client_updated_at` | `timestamptz` | Not null, usado para resolver conflictos |
| `last_change_id` | `uuid` | Not null, desempate determinista |
| `deleted_at` | `timestamptz` | Nullable, tombstone de sincronización |

## Sincronización offline

La función autenticada `sync_finance_data(p_changes jsonb)` aplica la cola del dispositivo con
estrategia de último cambio ganador y devuelve la fotografía canónica completa del usuario.
Las eliminaciones de movimientos y categorías se conservan como tombstones.

