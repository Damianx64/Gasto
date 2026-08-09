-- Esquema inicial de Supabase para Gasto.
-- Este archivo prepara una base de datos nueva con las tablas, seguridad y
-- sincronización que necesita la aplicación.

create extension if not exists pgcrypto;

create type public.transaction_type as enum ('income', 'expense');
create type public.wallet_type as enum ('cash', 'debit');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  user_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type public.transaction_type not null,
  color text,
  icon_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  last_change_id uuid not null default gen_random_uuid(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  type public.wallet_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  last_change_id uuid not null default gen_random_uuid(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid,
  wallet_id uuid,
  type public.transaction_type not null,
  amount numeric not null,
  description text,
  transaction_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  last_change_id uuid not null default gen_random_uuid(),
  deleted_at timestamptz,
  constraint transactions_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete set null (category_id),
  constraint transactions_wallet_owner_fkey
    foreign key (wallet_id, user_id)
    references public.wallets (id, user_id)
    on delete set null (wallet_id)
);

create index categories_offline_sync_idx
  on public.categories (user_id, deleted_at, client_updated_at);

create unique index wallets_active_name_idx
  on public.wallets (user_id, lower(btrim(name)))
  where deleted_at is null;

create index wallets_offline_sync_idx
  on public.wallets (user_id, deleted_at, client_updated_at);

create index transactions_offline_sync_idx
  on public.transactions (user_id, deleted_at, client_updated_at);

create index transactions_category_id_idx
  on public.transactions (category_id)
  where category_id is not null;

create index transactions_wallet_id_idx
  on public.transactions (wallet_id, user_id)
  where wallet_id is not null;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

create policy profiles_own_rows
  on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy categories_own_rows
  on public.categories
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy wallets_own_rows
  on public.wallets
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy transactions_own_rows
  on public.transactions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon;
revoke all on table public.categories from anon;
revoke all on table public.wallets from anon;
revoke all on table public.transactions from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.wallets to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;

create or replace function public.sync_finance_data(p_changes jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_change jsonb;
  v_record jsonb;
  v_type public.transaction_type;
  v_wallet_type public.wallet_type;
  v_category_id uuid;
  v_wallet_id uuid;
  v_category_deleted_at timestamptz;
  v_wallet_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '28000';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'p_changes debe ser un arreglo JSON.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_changes) as incoming(change)
    where incoming.change ->> 'entity' is null
       or incoming.change ->> 'entity' not in ('wallet', 'category', 'transaction')
       or jsonb_typeof(incoming.change -> 'record') is distinct from 'object'
  ) then
    raise exception 'La cola contiene una operación inválida.' using errcode = '22023';
  end if;

  -- Las billeteras se procesan primero para validar referencias posteriores.
  for v_change in
    select incoming.change
    from jsonb_array_elements(p_changes) as incoming(change)
    where incoming.change ->> 'entity' = 'wallet'
  loop
    v_record := v_change -> 'record';
    v_wallet_type := (v_record ->> 'type')::public.wallet_type;

    begin
      insert into public.wallets (
        id,
        user_id,
        name,
        type,
        created_at,
        updated_at,
        client_updated_at,
        last_change_id,
        deleted_at
      )
      values (
        (v_record ->> 'id')::uuid,
        v_user_id,
        btrim(v_record ->> 'name'),
        v_wallet_type,
        coalesce((v_record ->> 'created_at')::timestamptz, now()),
        now(),
        (v_record ->> 'client_updated_at')::timestamptz,
        (v_record ->> 'last_change_id')::uuid,
        (v_record ->> 'deleted_at')::timestamptz
      )
      on conflict (id) do update
      set
        name = excluded.name,
        type = excluded.type,
        updated_at = now(),
        client_updated_at = excluded.client_updated_at,
        last_change_id = excluded.last_change_id,
        deleted_at = excluded.deleted_at
      where public.wallets.user_id = v_user_id
        and (excluded.client_updated_at, excluded.last_change_id)
          > (public.wallets.client_updated_at, public.wallets.last_change_id);
    exception
      when unique_violation then
        raise exception 'Ya existe una billetera activa con ese nombre.' using errcode = '23505';
    end;
  end loop;

  -- Las categorías se procesan antes de los movimientos.
  for v_change in
    select incoming.change
    from jsonb_array_elements(p_changes) as incoming(change)
    where incoming.change ->> 'entity' = 'category'
  loop
    v_record := v_change -> 'record';
    v_type := (v_record ->> 'type')::public.transaction_type;

    insert into public.categories (
      id,
      user_id,
      name,
      type,
      color,
      icon_key,
      created_at,
      updated_at,
      client_updated_at,
      last_change_id,
      deleted_at
    )
    values (
      (v_record ->> 'id')::uuid,
      v_user_id,
      v_record ->> 'name',
      v_type,
      nullif(v_record ->> 'color', ''),
      nullif(v_record ->> 'icon_key', ''),
      coalesce((v_record ->> 'created_at')::timestamptz, now()),
      now(),
      (v_record ->> 'client_updated_at')::timestamptz,
      (v_record ->> 'last_change_id')::uuid,
      (v_record ->> 'deleted_at')::timestamptz
    )
    on conflict (id) do update
    set
      name = excluded.name,
      type = excluded.type,
      color = excluded.color,
      icon_key = excluded.icon_key,
      updated_at = now(),
      client_updated_at = excluded.client_updated_at,
      last_change_id = excluded.last_change_id,
      deleted_at = excluded.deleted_at
    where public.categories.user_id = v_user_id
      and (excluded.client_updated_at, excluded.last_change_id)
        > (public.categories.client_updated_at, public.categories.last_change_id);
  end loop;

  for v_change in
    select incoming.change
    from jsonb_array_elements(p_changes) as incoming(change)
    where incoming.change ->> 'entity' = 'transaction'
  loop
    v_record := v_change -> 'record';
    v_type := (v_record ->> 'type')::public.transaction_type;
    v_category_id := null;
    v_wallet_id := null;

    if nullif(v_record ->> 'category_id', '') is not null then
      select category.id
      into v_category_id
      from public.categories as category
      where category.id = (v_record ->> 'category_id')::uuid
        and category.user_id = v_user_id
        and category.type = v_type
        and category.deleted_at is null;
    end if;

    if nullif(v_record ->> 'wallet_id', '') is not null then
      select wallet.id
      into v_wallet_id
      from public.wallets as wallet
      where wallet.id = (v_record ->> 'wallet_id')::uuid
        and wallet.user_id = v_user_id
        and wallet.deleted_at is null;
    end if;

    insert into public.transactions (
      id,
      user_id,
      category_id,
      wallet_id,
      type,
      amount,
      description,
      transaction_date,
      created_at,
      updated_at,
      client_updated_at,
      last_change_id,
      deleted_at
    )
    values (
      (v_record ->> 'id')::uuid,
      v_user_id,
      v_category_id,
      v_wallet_id,
      v_type,
      (v_record ->> 'amount')::numeric,
      nullif(v_record ->> 'description', ''),
      (v_record ->> 'transaction_date')::date,
      coalesce((v_record ->> 'created_at')::timestamptz, now()),
      now(),
      (v_record ->> 'client_updated_at')::timestamptz,
      (v_record ->> 'last_change_id')::uuid,
      (v_record ->> 'deleted_at')::timestamptz
    )
    on conflict (id) do update
    set
      category_id = excluded.category_id,
      wallet_id = excluded.wallet_id,
      type = excluded.type,
      amount = excluded.amount,
      description = excluded.description,
      transaction_date = excluded.transaction_date,
      updated_at = now(),
      client_updated_at = excluded.client_updated_at,
      last_change_id = excluded.last_change_id,
      deleted_at = excluded.deleted_at
    where public.transactions.user_id = v_user_id
      and (excluded.client_updated_at, excluded.last_change_id)
        > (public.transactions.client_updated_at, public.transactions.last_change_id);
  end loop;

  -- Si el borrado de una categoría ganó el conflicto, sus movimientos quedan desvinculados.
  for v_change in
    select incoming.change
    from jsonb_array_elements(p_changes) as incoming(change)
    where incoming.change ->> 'entity' = 'category'
      and nullif(incoming.change -> 'record' ->> 'deleted_at', '') is not null
  loop
    v_record := v_change -> 'record';

    select category.deleted_at
    into v_category_deleted_at
    from public.categories as category
    where category.id = (v_record ->> 'id')::uuid
      and category.user_id = v_user_id;

    if v_category_deleted_at is not null then
      update public.transactions
      set category_id = null, updated_at = now()
      where user_id = v_user_id
        and category_id = (v_record ->> 'id')::uuid;
    end if;
  end loop;

  -- Si el borrado de una billetera ganó el conflicto, sus movimientos quedan desvinculados.
  for v_change in
    select incoming.change
    from jsonb_array_elements(p_changes) as incoming(change)
    where incoming.change ->> 'entity' = 'wallet'
      and nullif(incoming.change -> 'record' ->> 'deleted_at', '') is not null
  loop
    v_record := v_change -> 'record';

    select wallet.deleted_at
    into v_wallet_deleted_at
    from public.wallets as wallet
    where wallet.id = (v_record ->> 'id')::uuid
      and wallet.user_id = v_user_id;

    if v_wallet_deleted_at is not null then
      update public.transactions
      set wallet_id = null, updated_at = now()
      where user_id = v_user_id
        and wallet_id = (v_record ->> 'id')::uuid;
    end if;
  end loop;

  return jsonb_build_object(
    'server_time', now(),
    'wallets', coalesce(
      (
        select jsonb_agg(to_jsonb(wallet) - 'user_id' order by wallet.created_at, wallet.id)
        from public.wallets as wallet
        where wallet.user_id = v_user_id
      ),
      '[]'::jsonb
    ),
    'categories', coalesce(
      (
        select jsonb_agg(to_jsonb(category) - 'user_id' order by category.created_at, category.id)
        from public.categories as category
        where category.user_id = v_user_id
      ),
      '[]'::jsonb
    ),
    'transactions', coalesce(
      (
        select jsonb_agg(to_jsonb(transaction_row) - 'user_id' order by transaction_row.created_at, transaction_row.id)
        from public.transactions as transaction_row
        where transaction_row.user_id = v_user_id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke execute on function public.sync_finance_data(jsonb) from public;
revoke execute on function public.sync_finance_data(jsonb) from anon;
grant execute on function public.sync_finance_data(jsonb) to authenticated;
