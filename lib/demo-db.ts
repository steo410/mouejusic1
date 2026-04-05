import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  nickname: string;
  isAdmin?: boolean;
  createdAt: string;
};

export type Account = {
  userId: string;
  cashBalance: number;
};

export type Holding = {
  userId: string;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
};

export type Trade = {
  id: number;
  userId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  fee: number;
  tradedAt: string;
};

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  nickname: string;
  is_admin: boolean;
  created_at: string;
};

type AccountRow = {
  user_id: string;
  cash_balance: number | string;
};

type HoldingRow = {
  user_id: string;
  symbol: string;
  quantity: number;
  avg_buy_price: number | string;
};

type TradeRow = {
  id: number;
  user_id: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number | string;
  quantity: number;
  fee: number | string;
  traded_at: string;
};

const ADMIN_USERNAME = "steo410";
const ADMIN_PASSWORD = "steojhukna";
const ADMIN_NICKNAME = "CM sj";
const ADMIN_SEED_CASH = 10_000_000;
const USER_SEED_CASH = 1_000_000;

let adminReady: Promise<void> | null = null;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    nickname: row.nickname,
    isAdmin: row.is_admin,
    createdAt: row.created_at
  };
}

function toAccount(row: AccountRow): Account {
  return {
    userId: row.user_id,
    cashBalance: Number(row.cash_balance)
  };
}

function toHolding(row: HoldingRow): Holding {
  return {
    userId: row.user_id,
    symbol: row.symbol,
    quantity: row.quantity,
    avgBuyPrice: Number(row.avg_buy_price)
  };
}

function toTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    side: row.side,
    price: Number(row.price),
    quantity: row.quantity,
    fee: Number(row.fee),
    tradedAt: row.traded_at
  };
}

async function ensureAdminUser() {
  if (!adminReady) {
    adminReady = (async () => {
      const db = getSupabaseAdmin();
      const { data: existing, error: readError } = await db
        .from("users")
        .select("id")
        .eq("is_admin", true)
        .limit(1)
        .maybeSingle();
      if (readError) throw readError;
      if (existing) return;

      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const { data: inserted, error: insertError } = await db
        .from("users")
        .insert({
          username: ADMIN_USERNAME,
          password_hash: passwordHash,
          nickname: ADMIN_NICKNAME,
          is_admin: true
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const { error: accountError } = await db
        .from("accounts")
        .upsert({ user_id: inserted.id, cash_balance: ADMIN_SEED_CASH }, { onConflict: "user_id" });
      if (accountError) throw accountError;
    })();
  }
  await adminReady;
}

async function ensureUserAccount(userId: string, isAdmin: boolean) {
  const db = getSupabaseAdmin();
  const { data: account, error } = await db
    .from("accounts")
    .select("user_id,cash_balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (account) return toAccount(account as AccountRow);

  const seedCash = isAdmin ? ADMIN_SEED_CASH : USER_SEED_CASH;
  const { data: inserted, error: upsertError } = await db
    .from("accounts")
    .upsert({ user_id: userId, cash_balance: seedCash }, { onConflict: "user_id" })
    .select("user_id,cash_balance")
    .single();
  if (upsertError) throw upsertError;
  return toAccount(inserted as AccountRow);
}

export async function createUser(input: { username: string; passwordHash: string; nickname: string }): Promise<User | null> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("users")
    .insert({
      username: input.username,
      password_hash: input.passwordHash,
      nickname: input.nickname,
      is_admin: false
    })
    .select("id,username,password_hash,nickname,is_admin,created_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  if (!data) return null;

  await ensureUserAccount(data.id, false);
  return toUser(data as UserRow);
}

export async function findUserByUsername(username: string): Promise<User | null> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("users")
    .select("id,username,password_hash,nickname,is_admin,created_at")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function updateUserCredentialsIfNoPassword(input: { username: string; passwordHash: string; nickname: string }): Promise<User | null> {
  await ensureAdminUser();
  const existing = await findUserByUsername(input.username);
  if (!existing) return null;
  if (existing.passwordHash) return null;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("users")
    .update({ password_hash: input.passwordHash, nickname: input.nickname })
    .eq("id", existing.id)
    .select("id,username,password_hash,nickname,is_admin,created_at")
    .single();
  if (error) throw error;
  return toUser(data as UserRow);
}

export async function findUserById(userId: string): Promise<User | null> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("users")
    .select("id,username,password_hash,nickname,is_admin,created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function upsertUserFromClaims(input: { id: string; username: string; nickname: string; isAdmin?: boolean }): Promise<User> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();

  const existing = await findUserById(input.id);
  if (existing) return existing;

  const { data, error } = await db
    .from("users")
    .upsert(
      {
        id: input.id,
        username: input.username,
        password_hash: "",
        nickname: input.nickname,
        is_admin: input.isAdmin ?? false
      },
      { onConflict: "id" }
    )
    .select("id,username,password_hash,nickname,is_admin,created_at")
    .single();
  if (error) throw error;

  await ensureUserAccount(data.id, data.is_admin);
  return toUser(data as UserRow);
}

export async function getAdminUser(): Promise<User | null> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("users")
    .select("id,username,password_hash,nickname,is_admin,created_at")
    .eq("is_admin", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function createSession(userId: string): Promise<string> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("sessions")
    .insert({ user_id: userId })
    .select("token")
    .single();
  if (error) throw error;
  return String(data.token);
}

export async function getUserBySession(token: string): Promise<User | null> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("sessions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data?.user_id) return null;
  return findUserById(String(data.user_id));
}

export async function getAccount(userId: string): Promise<Account | null> {
  await ensureAdminUser();
  const user = await findUserById(userId);
  if (!user) return null;
  return ensureUserAccount(userId, user.isAdmin ?? false);
}

export async function setCash(userId: string, cashBalance: number): Promise<void> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("accounts")
    .upsert({ user_id: userId, cash_balance: cashBalance }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function getHolding(userId: string, symbol: string): Promise<Holding | null> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("holdings")
    .select("user_id,symbol,quantity,avg_buy_price")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .maybeSingle();
  if (error) throw error;
  return data ? toHolding(data as HoldingRow) : null;
}

export async function upsertHolding(userId: string, symbol: string, quantity: number, avgBuyPrice: number): Promise<void> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { error } = await db.from("holdings").upsert(
    {
      user_id: userId,
      symbol,
      quantity,
      avg_buy_price: avgBuyPrice
    },
    { onConflict: "user_id,symbol" }
  );
  if (error) throw error;
}

export async function removeHolding(userId: string, symbol: string): Promise<void> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { error } = await db.from("holdings").delete().eq("user_id", userId).eq("symbol", symbol);
  if (error) throw error;
}

export async function listHoldings(userId: string): Promise<Holding[]> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("holdings")
    .select("user_id,symbol,quantity,avg_buy_price")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row: unknown) => toHolding(row as HoldingRow));
}

export async function addTrade(input: Omit<Trade, "id" | "tradedAt">): Promise<Trade> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("trades")
    .insert({
      user_id: input.userId,
      symbol: input.symbol,
      side: input.side,
      price: input.price,
      quantity: input.quantity,
      fee: input.fee
    })
    .select("id,user_id,symbol,side,price,quantity,fee,traded_at")
    .single();
  if (error) throw error;
  return toTrade(data as TradeRow);
}

export async function listUsers(): Promise<User[]> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("users")
    .select("id,username,password_hash,nickname,is_admin,created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => toUser(row as UserRow));
}

export async function listTrades(userId: string): Promise<Trade[]> {
  await ensureAdminUser();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("trades")
    .select("id,user_id,symbol,side,price,quantity,fee,traded_at")
    .eq("user_id", userId)
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => toTrade(row as TradeRow));
}
