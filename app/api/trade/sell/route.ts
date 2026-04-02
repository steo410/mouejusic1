import { requireUser } from "@/lib/auth";
import { getQuote } from "@/lib/finance";
import { addTrade, getAccount, getHolding, removeHolding, setCash, upsertHolding } from "@/lib/demo-db";
import { sellRevenue } from "@/lib/trade";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const { symbol, quantity } = await req.json();
  if (!symbol || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ message: "매도 수량은 1 이상의 정수여야 합니다." }, { status: 400 });
  }

  const account = getAccount(user.id);
  const holding = getHolding(user.id, symbol);
  if (!account || !holding) return NextResponse.json({ message: "보유 종목이 없습니다." }, { status: 400 });
  if (holding.quantity < quantity) return NextResponse.json({ message: "보유 수량을 초과했습니다." }, { status: 400 });

  const quote = await getQuote(symbol);
  const price = Number(quote.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ message: "현재가 조회 실패" }, { status: 502 });
  }

  const { fee, net } = sellRevenue(price, quantity);
  const remainQty = holding.quantity - quantity;

  if (remainQty <= 0) removeHolding(user.id, symbol);
  else upsertHolding(user.id, symbol, remainQty, holding.avgBuyPrice);

  setCash(user.id, account.cashBalance + net);
  addTrade({ userId: user.id, symbol, side: "SELL", price, quantity, fee });

  return NextResponse.json({ message: "매도 완료", symbol, price, quantity, fee, cashBalance: account.cashBalance + net });
}
