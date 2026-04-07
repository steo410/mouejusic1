import { requireUser } from "@/lib/auth";
import { getAccount, setCash } from "@/lib/demo-db";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { userId, amount, type } = await req.json();
  const gift = Number(amount);
  const isWithdraw = type === "withdraw";

  if (!userId || !Number.isFinite(gift) || gift <= 0) {
    return NextResponse.json({ message: "유효한 유저/금액을 입력해주세요." }, { status: 400 });
  }

  const account = await getAccount(String(userId));
  if (!account) return NextResponse.json({ message: "대상 유저 계좌를 찾지 못했습니다." }, { status: 404 });

  let newBalance: number;
  if (isWithdraw) {
    newBalance = account.cashBalance - gift;
    if (newBalance < 0) {
      return NextResponse.json({ message: "보유 금액보다 더 많은 금액을 회수할 수 없습니다." }, { status: 400 });
    }
  } else {
    newBalance = account.cashBalance + gift;
  }

  await setCash(String(userId), newBalance);
  revalidatePath("/admin");
  revalidatePath("/mypage");

  return NextResponse.json(
    { 
      message: isWithdraw ? "금액 회수 완료" : "선물 지급 완료", 
      userId: String(userId), 
      amount: gift,
      newBalance 
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
