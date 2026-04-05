"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Post = {
  id: number;
  user_id: string;
  author_nickname: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type Me = {
  user: { id: string; nickname: string; isAdmin?: boolean } | null;
};

function toKST(dateStr: string) {
  return new Date(dateStr).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [me, setMe] = useState<Me>({ user: null });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${params.id}`).then((r) => r.json()),
      fetch("/api/me", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([postData, meData]) => {
      setPost(postData.post ?? null);
      setMe(meData);
      setLoading(false);
    });
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    const res = await fetch(`/api/posts/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/board");
    } else {
      const data = await res.json();
      alert(data.message);
      setDeleting(false);
    }
  }

  const canDelete = me.user && post && (me.user.id === post.user_id || me.user.isAdmin);

  if (loading) return <p className="text-sm text-slate-400">불러오는 중...</p>;
  if (!post) return <p className="text-sm text-slate-400">게시글을 찾을 수 없습니다.</p>;

  return (
    <div className="space-y-4">
      <Link href="/board" className="text-sm text-slate-400 hover:text-slate-200">← 목록으로</Link>

      <div className="rounded border border-slate-800 p-4 space-y-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{post.title}</h1>
          <p className="text-xs text-slate-400">
            {post.author_nickname} · {toKST(post.created_at)}
          </p>
        </div>

        <hr className="border-slate-800" />

        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt="첨부 이미지"
              className="rounded max-w-full object-contain"
            />
          </div>
        )}

        {canDelete && (
          <div className="pt-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-700 px-3 py-1.5 text-sm hover:bg-red-600 disabled:opacity-60"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
