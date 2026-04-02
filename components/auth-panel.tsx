"use client";

import { useState } from "react";

export function AuthPanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [msg, setMsg] = useState("");

  async function register() {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, nickname })
    });
    const data = await res.json();
    setMsg(data.message ?? (res.ok ? "회원가입 성공" : "회원가입 실패"));
  }

  async function login() {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    setMsg(data.message ?? (res.ok ? "로그인 성공" : "로그인 실패"));
  }

  return (
    <section className="grid gap-3 rounded-lg border border-slate-800 p-4">
      <input className="rounded bg-slate-900 p-2" placeholder="아이디 (6자+)" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input className="rounded bg-slate-900 p-2" placeholder="비밀번호 (8자+)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input className="rounded bg-slate-900 p-2" placeholder="닉네임 (회원가입시)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
      <div className="flex gap-2">
        <button className="rounded bg-indigo-500 px-3 py-2" onClick={register}>회원가입</button>
        <button className="rounded bg-emerald-600 px-3 py-2" onClick={login}>로그인</button>
      </div>
      <p className="text-sm text-slate-300">{msg}</p>
    </section>
  );
}
