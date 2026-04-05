import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("posts")
    .select("id, user_id, author_nickname, title, image_url, created_at")
    .order("id", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();
  const { title, content, image_url } = body;
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ message: "제목과 내용을 입력해주세요." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("posts")
    .insert({
      user_id: user.id,
      author_nickname: user.nickname,
      title: title.trim(),
      content: content.trim(),
      image_url: image_url ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
