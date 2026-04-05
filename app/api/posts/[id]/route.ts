import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("posts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "게시글을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ post: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: post } = await db
    .from("posts")
    .select("user_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!post) return NextResponse.json({ message: "게시글을 찾을 수 없습니다." }, { status: 404 });

  if (post.user_id !== user.id && !user.isAdmin) {
    return NextResponse.json({ message: "삭제 권한이 없습니다." }, { status: 403 });
  }

  const { error } = await db.from("posts").delete().eq("id", params.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ message: "삭제되었습니다." });
}
