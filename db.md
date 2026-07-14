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
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

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

