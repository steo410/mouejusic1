import bcrypt from "bcryptjs";
import { encodeSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { findUserByUsername } from "@/lib/demo-db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "아이디/비밀번호를 입력해주세요." }, { status: 400 });

  const username = parsed.data.username.trim();
  const user = await findUserByUsername(username);
  if (!user) return NextResponse.json({ message: "로그인 실패" }, { status: 401 });

  if (!user.passwordHash || !user.passwordHash.startsWith("$2")) {
    return NextResponse.json({ message: "로그인 실패" }, { status: 401 });
  }

  let matched = false;
  try {
    matched = await bcrypt.compare(parsed.data.password, user.passwordHash);
  } catch {
    matched = false;
  }
  if (!matched) return NextResponse.json({ message: "로그인 실패" }, { status: 401 });

  const res = NextResponse.json({ message: "로그인 성공", user: { id: user.id, nickname: user.nickname } });
  const token = encodeSessionUser({ id: user.id, username: user.username, nickname: user.nickname, isAdmin: user.isAdmin ?? false });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
