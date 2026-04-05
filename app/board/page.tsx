"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Post = {
  id: number;
  author_nickname: string;
  title: string;
  image_url: string | null;
  created_at: string;
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

export default function BoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">게시판</h1>
        <Link
          href="/board/write"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          글쓰기
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-400">불러오는 중...</p>}

      {!loading && posts.length === 0 && (
        <p className="text-sm text-slate-400">아직 작성된 글이 없습니다. 첫 글을 작성해보세요!</p>
      )}

      <div className="space-y-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/board/${post.id}`}
            className="block rounded border border-slate-800 p-3 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="font-medium truncate">{post.title}</p>
                <p className="text-xs text-slate-400">
                  {post.author_nickname} · {toKST(post.created_at)}
                </p>
              </div>
              {post.image_url && (
                <span className="text-xs text-slate-500 flex-shrink-0">📷 사진</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
