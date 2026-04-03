import { requireUser } from "@/lib/auth";
import { getQuote } from "@/lib/finance";
import { addTrade, getAccount, getAdminUser, getHolding, setCash, upsertHolding } from "@/lib/demo-db";
import { buyCost } from "@/lib/trade";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const { symbol, quantity } = await req.json();
  if (!symbol || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ message: "매수 수량은 1 이상의 정수여야 합니다." }, { status: 400 });
  }

  const account = getAccount(user.id);
  if (!account) return NextResponse.json({ message: "계좌 정보가 없습니다." }, { status: 400 });

  const quote = await getQuote(symbol);
  const price = Number(quote.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ message: "현재가 조회 실패" }, { status: 502 });
  }

  const amountKrw = price * quantity;
  const { fee, total } = buyCost(amountKrw);
  if (account.cashBalance < total) {
    return NextResponse.json({ message: "현금 잔고가 부족합니다." }, { status: 400 });
  }

  const old = getHolding(user.id, symbol);
  const oldQty = old?.quantity ?? 0;
  const oldAvg = old?.avgBuyPrice ?? 0;
  const newQty = oldQty + quantity;
  const newAvg = oldQty === 0 ? price : (oldQty * oldAvg + quantity * price) / newQty;

  const nextCash = account.cashBalance - total;
  setCash(user.id, nextCash);
  upsertHolding(user.id, symbol, newQty, newAvg);
  addTrade({ userId: user.id, symbol, side: "BUY", price, quantity, fee });

  const admin = getAdminUser();
  if (admin && admin.id !== user.id) {
    const adminAccount = getAccount(admin.id);
    if (adminAccount) {
      setCash(admin.id, adminAccount.cashBalance + fee);
    }
  }

  return NextResponse.json({ message: "매수 완료", symbol, price, quantity, fee, cashBalance: nextCash });
}
