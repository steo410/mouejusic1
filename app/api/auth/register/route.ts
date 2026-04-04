import bcrypt from "bcryptjs";
import { createUser, updateUserCredentialsIfNoPassword } from "@/lib/demo-db";
import { encodeSessionUser, SESSION_COOKIE } from "@/lib/auth";
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

  const username = parsed.data.username.trim();
  const nickname = parsed.data.nickname.trim();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  let user = await createUser({
    username,
    passwordHash,
    nickname
  });

  if (!user) {
    user = await updateUserCredentialsIfNoPassword({ username, passwordHash, nickname });
  }

  if (!user) {
    return NextResponse.json({ message: "이미 존재하는 아이디입니다." }, { status: 409 });
  }

  const res = NextResponse.json({ message: "회원가입 완료", user: { id: user.id, nickname: user.nickname } });
  const token = encodeSessionUser({ id: user.id, username: user.username, nickname: user.nickname, isAdmin: user.isAdmin ?? false });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
