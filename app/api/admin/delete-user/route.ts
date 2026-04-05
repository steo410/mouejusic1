import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ message: "userId가 필요합니다." }, { status: 400 });
  }
  if (userId === me.id) {
    return NextResponse.json({ message: "자기 자신은 탈퇴시킬 수 없습니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  await db.from("trades").delete().eq("user_id", userId);
  await db.from("holdings").delete().eq("user_id", userId);
  await db.from("accounts").delete().eq("user_id", userId);
  await db.from("sessions").delete().eq("user_id", userId);
  const { error } = await db.from("users").delete().eq("id", userId);

  if (error) {
    return NextResponse.json({ message: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ message: "회원 탈퇴 완료" });
}
