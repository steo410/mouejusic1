create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null default '',
  nickname text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  user_id uuid primary key references users(id) on delete cascade,
  cash_balance numeric(18,2) not null default 0
);

create table if not exists holdings (
  user_id uuid not null references users(id) on delete cascade,
  symbol text not null,
  quantity integer not null check (quantity >= 0),
  avg_buy_price numeric(18,6) not null default 0,
  primary key (user_id, symbol)
);

create table if not exists trades (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('BUY', 'SELL')),
  price numeric(18,6) not null,
  quantity integer not null check (quantity > 0),
  fee numeric(18,6) not null,
  traded_at timestamptz not null default now()
);

create table if not exists sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_trades_user_id on trades(user_id);
create index if not exists idx_holdings_user_id on holdings(user_id);
