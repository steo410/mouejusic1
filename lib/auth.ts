import { cookies } from "next/headers";
import { findUserById, upsertUserFromClaims } from "@/lib/demo-db";

export const SESSION_COOKIE = "stocksim_session";

type SessionUserClaims = {
  id: string;
  username: string;
  nickname: string;
  isAdmin?: boolean;
};

export function encodeSessionUser(user: SessionUserClaims) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

function decodeSessionUser(raw: string): SessionUserClaims | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionUserClaims;
    if (!parsed?.id || !parsed?.username || !parsed?.nickname) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const claims = decodeSessionUser(raw);
  if (!claims) return null;

  const user = await findUserById(claims.id);
  if (user) return user;

  return upsertUserFromClaims(claims);
}
