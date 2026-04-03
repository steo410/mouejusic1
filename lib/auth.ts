import { cookies } from "next/headers";
import { findUserById } from "@/lib/demo-db";

export const SESSION_COOKIE = "stocksim_session";

export async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return findUserById(userId);
}
