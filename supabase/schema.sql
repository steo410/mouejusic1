create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null check (char_length(username) >= 6),
  password_hash text not null,
  nickname text not null,
  initial_seeded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  user_id uuid primary key references app_users(id) on delete cascade,
  cash_balance numeric(20,4) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists krx_symbols (
  code text primary key,
  name text not null,
  market text,
  updated_at timestamptz not null default now()
);

create table if not exists holdings (
  user_id uuid not null references app_users(id) on delete cascade,
  symbol text not null,
  quantity numeric(20,8) not null default 0,
  avg_buy_price numeric(20,8) not null default 0,
  primary key (user_id, symbol)
);

create type trade_side as enum ('BUY','SELL');

create table if not exists trades (
  id bigint generated always as identity primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  symbol text not null,
  side trade_side not null,
  price numeric(20,8) not null,
  quantity numeric(20,8) not null,
  fee numeric(20,8) not null,
  traded_at timestamptz not null default now()
);

alter table app_users enable row level security;
alter table accounts enable row level security;
alter table holdings enable row level security;
alter table trades enable row level security;

create policy "user owns app_users" on app_users
  for all using (auth.uid() = id);

create policy "user owns account" on accounts
  for all using (auth.uid() = user_id);

create policy "user owns holdings" on holdings
  for all using (auth.uid() = user_id);

create policy "user owns trades" on trades
  for all using (auth.uid() = user_id);

-- 최초 지급 예시(서버 트랜잭션에서 1회만 수행)
-- update accounts set cash_balance = cash_balance + 1000000 where user_id = :uid and not exists (...);
