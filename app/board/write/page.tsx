"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function WritePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      setMsg("제목과 내용을 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setMsg("");

    let image_url: string | null = null;

    if (imageFile) {
      const supabase = createClient(supabaseUrl, supabaseAnon);
      const ext = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("post-images")
        .upload(fileName, imageFile, { upsert: false });

      if (error) {
        setMsg(`이미지 업로드 실패: ${error.message}`);
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(data.path);
      image_url = urlData.publicUrl;
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, image_url }),
    });
    const result = await res.json();

    if (res.ok) {
      router.push(`/board/${result.id}`);
    } else {
      setMsg(result.message ?? "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">글쓰기</h1>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">제목</label>
          <input
            className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">내용</label>
          <textarea
            className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm min-h-[200px] resize-y"
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">사진 첨부 (선택)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm text-slate-300"
          />
          {preview && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="미리보기" className="max-h-48 rounded object-contain" />
              <button
                onClick={() => {
                  setImageFile(null);
                  setPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="mt-1 text-xs text-red-400 hover:text-red-300"
              >
                사진 제거
              </button>
            </div>
          )}
        </div>

        {msg && <p className="text-sm text-red-400">{msg}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
          <button
            onClick={() => router.push("/board")}
            className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
