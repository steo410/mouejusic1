import { requireUser } from "@/lib/auth";
import { getChart, getQuote } from "@/lib/finance";
import { addTrade, getAccount, getAdminUser, getHolding, removeHolding, setCash, upsertHolding } from "@/lib/demo-db";
import { sellRevenue } from "@/lib/trade";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const { symbol, quantity } = await req.json();
  const normalizedSymbol = String(symbol || "").toUpperCase();
  if (!normalizedSymbol || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ message: "매도 수량은 1 이상의 정수여야 합니다." }, { status: 400 });
  }

  const account = getAccount(user.id);
  const holding = getHolding(user.id, normalizedSymbol);
  if (!account || !holding) return NextResponse.json({ message: "보유 종목이 없습니다." }, { status: 400 });
  if (holding.quantity < quantity) return NextResponse.json({ message: "보유 수량을 초과했습니다." }, { status: 400 });

  let price = 0;
  try {
    const quote = await getQuote(normalizedSymbol);
    price = Number(quote.regularMarketPrice);
  } catch {
    try {
      const chart = await getChart(normalizedSymbol, "1d");
      price = [...chart.quotes].reverse().find((x) => Number.isFinite(x.close) && (x.close ?? 0) > 0)?.close ?? 0;
    } catch {
      return NextResponse.json({ message: "현재가 조회 실패" }, { status: 502 });
    }
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ message: "현재가 조회 실패" }, { status: 502 });
  }

  const { fee, net } = sellRevenue(price, quantity);
  const remainQty = holding.quantity - quantity;

  if (remainQty <= 0) removeHolding(user.id, normalizedSymbol);
  else upsertHolding(user.id, normalizedSymbol, remainQty, holding.avgBuyPrice);

  setCash(user.id, account.cashBalance + net);
  addTrade({ userId: user.id, symbol: normalizedSymbol, side: "SELL", price, quantity, fee });

  const admin = getAdminUser();
  if (admin && admin.id !== user.id) {
    const adminAccount = getAccount(admin.id);
    if (adminAccount) {
      setCash(admin.id, adminAccount.cashBalance + fee);
    }
  }

  revalidatePath("/mypage");
  revalidatePath("/admin");
  revalidatePath(`/stock/${normalizedSymbol}`);

  return NextResponse.json(
    { message: "매도 완료", symbol: normalizedSymbol, price, quantity, fee, cashBalance: account.cashBalance + net },
    { headers: { "Cache-Control": "no-store" } }
  );
}
