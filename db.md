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
| `wallet_id` | `uuid` | Nullable; `ON DELETE SET NULL` |
| `type` | `transaction_type` |  |
| `amount` | `numeric` |  |
| `description` | `text` |  Nullable |
| `transaction_date` | `date` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `client_updated_at` | `timestamptz` | Not null, usado para resolver conflictos |
| `last_change_id` | `uuid` | Not null, desempate determinista |
| `deleted_at` | `timestamptz` | Nullable, tombstone de sincronización |

## Table `wallets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` | Propietario; referencia a `auth.users` |
| `name` | `text` | Nombre activo único por usuario, ignorando mayúsculas y espacios externos |
| `type` | `wallet_type` | `cash` o `debit` |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `client_updated_at` | `timestamptz` | Not null, usado para resolver conflictos |
| `last_change_id` | `uuid` | Not null, desempate determinista |
| `deleted_at` | `timestamptz` | Nullable, tombstone de sincronización |

`Balance general` es una vista virtual, no una billetera. Incluye todas las transacciones,
también aquellas cuyo `wallet_id` sea `NULL`. El saldo de cada billetera se deriva de sus
ingresos menos sus gastos.

## Sincronización offline

La función autenticada `sync_finance_data(p_changes jsonb)` procesa primero billeteras y
categorías, y después movimientos. Aplica la cola del dispositivo con estrategia de último
cambio ganador y devuelve la fotografía canónica completa del usuario.

Las eliminaciones se conservan como tombstones. Cuando gana la eliminación de una billetera,
el RPC cambia a `NULL` el `wallet_id` de sus movimientos; la clave foránea cubre además un
borrado físico posterior. Las referencias a billeteras inexistentes, eliminadas o de otro
usuario se normalizan también a `NULL`.

