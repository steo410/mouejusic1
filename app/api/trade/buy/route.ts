import { requireUser } from "@/lib/auth";
import { getChart, getQuote } from "@/lib/finance";
import { addTrade, getAccount, getAdminUser, getHolding, setCash, upsertHolding } from "@/lib/demo-db";
import { buyCost } from "@/lib/trade";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const { symbol, quantity } = await req.json();
  const normalizedSymbol = String(symbol || "").toUpperCase();
  if (!normalizedSymbol || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ message: "매수 수량은 1 이상의 정수여야 합니다." }, { status: 400 });
  }

  const account = await getAccount(user.id);
  if (!account) return NextResponse.json({ message: "계좌 정보가 없습니다." }, { status: 400 });

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

  const amountKrw = price * quantity;
  const { fee, total } = buyCost(amountKrw);
  if (account.cashBalance < total) {
    return NextResponse.json({ message: "현금 잔고 부족합니다." }, { status: 400 });
  }

  const old = await getHolding(user.id, normalizedSymbol);
  const oldQty = old?.quantity ?? 0;
  const oldAvg = old?.avgBuyPrice ?? 0;
  const newQty = oldQty + quantity;
  const newAvg = oldQty === 0 ? price : (oldQty * oldAvg + quantity * price) / newQty;

  const nextCash = account.cashBalance - total;
  await setCash(user.id, nextCash);
  await upsertHolding(user.id, normalizedSymbol, newQty, newAvg);
  await addTrade({ userId: user.id, symbol: normalizedSymbol, side: "BUY", price, quantity, fee });

  const admin = await getAdminUser();
  if (admin && admin.id !== user.id) {
    const adminAccount = await getAccount(admin.id);
    if (adminAccount) {
      await setCash(admin.id, adminAccount.cashBalance + fee);
    }
  }

  revalidatePath("/mypage");
  revalidatePath("/admin");
  revalidatePath(`/stock/${normalizedSymbol}`);

  return NextResponse.json(
    { message: "매수 완료", symbol: normalizedSymbol, price, quantity, fee, cashBalance: nextCash },
    { headers: { "Cache-Control": "no-store" } }
  );
}
