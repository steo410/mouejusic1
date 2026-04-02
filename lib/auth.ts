import { cookies } from "next/headers";
import { getUserBySession } from "@/lib/demo-db";

export const SESSION_COOKIE = "stocksim_session";

export async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySession(token);
}
