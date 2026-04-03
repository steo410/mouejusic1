import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/demo-db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200, headers: { "Cache-Control": "no-store" } });

  const account = getAccount(user.id);
  return NextResponse.json({
    user: { id: user.id, username: user.username, nickname: user.nickname, isAdmin: user.isAdmin ?? false },
    cashBalance: account?.cashBalance ?? 0
  }, { headers: { "Cache-Control": "no-store" } });
}
