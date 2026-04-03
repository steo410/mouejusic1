import crypto from "crypto";
import bcrypt from "bcryptjs";

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

type Session = { token: string; userId: string; createdAt: string };

type Store = {
  users: User[];
  accounts: Account[];
  holdings: Holding[];
  trades: Trade[];
  sessions: Session[];
  nextTradeId: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __stockSimStore: Store | undefined;
}

function getStore(): Store {
  if (!global.__stockSimStore) {
    const now = new Date().toISOString();
    const masterUser: User = {
      id: crypto.randomUUID(),
      username: "steo410",
      passwordHash: bcrypt.hashSync("steojhukna", 10),
      nickname: "CM sj",
      isAdmin: true,
      createdAt: now
    };

    global.__stockSimStore = {
      users: [masterUser],
      accounts: [{ userId: masterUser.id, cashBalance: 10_000_000 }],
      holdings: [],
      trades: [],
      sessions: [],
      nextTradeId: 1
    };
  }
  return global.__stockSimStore;
}

export function createUser(input: { username: string; passwordHash: string; nickname: string }) {
  const store = getStore();
  if (store.users.some((u) => u.username === input.username)) return null;

  const user: User = {
    id: crypto.randomUUID(),
    username: input.username,
    passwordHash: input.passwordHash,
    nickname: input.nickname,
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  store.accounts.push({ userId: user.id, cashBalance: 1_000_000 });
  return user;
}

export function findUserByUsername(username: string) {
  return getStore().users.find((u) => u.username === username) ?? null;
}

export function findUserById(userId: string) {
  return getStore().users.find((u) => u.id === userId) ?? null;
}

export function getAdminUser() {
  return getStore().users.find((u) => u.isAdmin) ?? null;
}

export function createSession(userId: string) {
  const token = crypto.randomUUID();
  getStore().sessions.push({ token, userId, createdAt: new Date().toISOString() });
  return token;
}

export function getUserBySession(token: string) {
  const store = getStore();
  const s = store.sessions.find((x) => x.token === token);
  if (!s) return null;
  return findUserById(s.userId);
}

export function getAccount(userId: string) {
  return getStore().accounts.find((a) => a.userId === userId) ?? null;
}

export function setCash(userId: string, cashBalance: number) {
  const account = getAccount(userId);
  if (!account) return;
  account.cashBalance = cashBalance;
}

export function getHolding(userId: string, symbol: string) {
  return getStore().holdings.find((h) => h.userId === userId && h.symbol === symbol) ?? null;
}

export function upsertHolding(userId: string, symbol: string, quantity: number, avgBuyPrice: number) {
  const store = getStore();
  const existing = getHolding(userId, symbol);
  if (existing) {
    existing.quantity = quantity;
    existing.avgBuyPrice = avgBuyPrice;
    return;
  }
  store.holdings.push({ userId, symbol, quantity, avgBuyPrice });
}

export function removeHolding(userId: string, symbol: string) {
  const store = getStore();
  store.holdings = store.holdings.filter((h) => !(h.userId === userId && h.symbol === symbol));
}

export function listHoldings(userId: string) {
  return getStore().holdings.filter((h) => h.userId === userId);
}

export function addTrade(input: Omit<Trade, "id" | "tradedAt">) {
  const store = getStore();
  const t: Trade = {
    id: store.nextTradeId++,
    ...input,
    tradedAt: new Date().toISOString()
  };
  store.trades.push(t);
  return t;
}

export function listUsers() {
  return getStore().users;
}

export function listTrades(userId: string) {
  return getStore().trades.filter((t) => t.userId === userId).sort((a,b)=> b.id-a.id);
}
