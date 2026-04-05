import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { userId, newPassword } = await req.json();
  if (!userId || !newPassword || String(newPassword).length < 4) {
    return NextResponse.json({ message: "userId와 4자 이상의 새 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ message: "재설정 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ message: "비밀번호 재설정 완료" });
}
