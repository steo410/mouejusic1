import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

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

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "demo-db.json");

function persistStore(store: Store) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store), "utf8");
  } catch {
    // 일부 배포 환경(읽기 전용 파일시스템)에서는 디스크 저장이 실패할 수 있으므로
    // 메모리 스토어만으로 계속 동작하도록 예외를 삼킨다.
  }
}

function loadStoreFromDisk(): Store | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    if (!raw) return null;
    return JSON.parse(raw) as Store;
  } catch {
    return null;
  }
}

function getStore(): Store {
  if (!global.__stockSimStore) {
    global.__stockSimStore = loadStoreFromDisk() ?? {
      users: [],
      accounts: [],
      holdings: [],
      trades: [],
      sessions: [],
      nextTradeId: 1
    };
  }

  if (!global.__stockSimStore.users.some((u) => u.isAdmin)) {
    const now = new Date().toISOString();
    const masterUser: User = {
      id: crypto.randomUUID(),
      username: "steo410",
      passwordHash: bcrypt.hashSync("steojhukna", 10),
      nickname: "CM sj",
      isAdmin: true,
      createdAt: now
    };
    global.__stockSimStore.users.push(masterUser);
    global.__stockSimStore.accounts.push({ userId: masterUser.id, cashBalance: 10_000_000 });
    persistStore(global.__stockSimStore);
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
  persistStore(store);
  return user;
}

export function findUserByUsername(username: string) {
  return getStore().users.find((u) => u.username === username) ?? null;
}

export function findUserById(userId: string) {
  return getStore().users.find((u) => u.id === userId) ?? null;
}

export function upsertUserFromClaims(input: { id: string; username: string; nickname: string; isAdmin?: boolean }) {
  const store = getStore();
  const existing = findUserById(input.id);
  if (existing) return existing;

  const user: User = {
    id: input.id,
    username: input.username,
    passwordHash: "",
    nickname: input.nickname,
    isAdmin: input.isAdmin ?? false,
    createdAt: new Date().toISOString()
  };
  store.users.push(user);
  store.accounts.push({ userId: user.id, cashBalance: user.isAdmin ? 10_000_000 : 1_000_000 });
  persistStore(store);
  return user;
}

export function getAdminUser() {
  return getStore().users.find((u) => u.isAdmin) ?? null;
}

export function createSession(userId: string) {
  const token = crypto.randomUUID();
  const store = getStore();
  store.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  persistStore(store);
  return token;
}

export function getUserBySession(token: string) {
  const store = getStore();
  const s = store.sessions.find((x) => x.token === token);
  if (!s) return null;
  return findUserById(s.userId);
}

export function getAccount(userId: string) {
  const store = getStore();
  const existing = store.accounts.find((a) => a.userId === userId);
  if (existing) return existing;

  const user = findUserById(userId);
  if (!user) return null;

  const account: Account = { userId, cashBalance: user.isAdmin ? 10_000_000 : 1_000_000 };
  store.accounts.push(account);
  persistStore(store);
  return account;
}

export function setCash(userId: string, cashBalance: number) {
  const store = getStore();
  const account = getAccount(userId);
  if (!account) return;
  account.cashBalance = cashBalance;
  persistStore(store);
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
    persistStore(store);
    return;
  }
  store.holdings.push({ userId, symbol, quantity, avgBuyPrice });
  persistStore(store);
}

export function removeHolding(userId: string, symbol: string) {
  const store = getStore();
  store.holdings = store.holdings.filter((h) => !(h.userId === userId && h.symbol === symbol));
  persistStore(store);
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
  persistStore(store);
  return t;
}

export function listUsers() {
  return getStore().users;
}

export function listTrades(userId: string) {
  return getStore().trades.filter((t) => t.userId === userId).sort((a,b)=> b.id-a.id);
}
