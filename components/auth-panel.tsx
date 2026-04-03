"use client";

import { useState } from "react";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function register() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, nickname })
      });
      const data = await res.json();
      setMsg(data.message ?? (res.ok ? "회원가입 성공" : "회원가입 실패"));
      if (res.ok) {
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      setMsg(data.message ?? (res.ok ? "로그인 성공" : "로그인 실패"));
      if (res.ok) {
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-slate-800 p-4">
      <div className="flex gap-2">
        <button
          className={`rounded px-3 py-2 ${mode === "login" ? "bg-emerald-600" : "bg-slate-700"}`}
          onClick={() => setMode("login")}
        >
          로그인
        </button>
        <button
          className={`rounded px-3 py-2 ${mode === "register" ? "bg-indigo-500" : "bg-slate-700"}`}
          onClick={() => setMode("register")}
        >
          회원가입
        </button>
      </div>
      <input className="rounded bg-slate-900 p-2" placeholder="아이디 (6자+)" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input className="rounded bg-slate-900 p-2" placeholder="비밀번호 (8자+)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {mode === "register" && (
        <input className="rounded bg-slate-900 p-2" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} />
      )}
      {mode === "register" ? (
        <button disabled={loading} className="rounded bg-indigo-500 px-3 py-2 disabled:opacity-70" onClick={register}>회원가입</button>
      ) : (
        <button disabled={loading} className="rounded bg-emerald-600 px-3 py-2 disabled:opacity-70" onClick={login}>로그인</button>
      )}
      <p className="text-sm text-slate-300">{msg}</p>
    </section>
  );
}
