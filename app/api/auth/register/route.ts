import bcrypt from "bcryptjs";
import { createSession, createUser } from "@/lib/demo-db";
import { SESSION_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(6),
  password: z.string().min(8),
  nickname: z.string().min(1)
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "아이디 6자 이상, 비밀번호 8자 이상으로 입력해주세요." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = createUser({
    username: parsed.data.username,
    passwordHash,
    nickname: parsed.data.nickname
  });

  if (!user) {
    return NextResponse.json({ message: "이미 존재하는 아이디입니다." }, { status: 409 });
  }

  const token = createSession(user.id);
  const res = NextResponse.json({ message: "회원가입 완료", user: { id: user.id, nickname: user.nickname } });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
