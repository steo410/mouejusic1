import { requireUser } from "@/lib/auth";
import { listTrades } from "@/lib/trades-query";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json(listTrades(user.id), { headers: { "Cache-Control": "no-store" } });
}
