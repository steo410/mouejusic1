import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccount, listHoldings, listTrades, listUsers } from "@/lib/demo-db";

export default async function AdminPage() {
  const me = await requireUser();
  if (!me || !me.isAdmin) {
    redirect("/");
  }

  const users = listUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">관리자 페이지</h1>
      <p className="text-sm text-slate-400">회원 상세 정보 (관리자 전용)</p>
      <div className="space-y-3">
        {users.map((u) => {
          const account = getAccount(u.id);
          const holdings = listHoldings(u.id);
          const trades = listTrades(u.id);
          return (
            <section key={u.id} className="rounded border border-slate-800 p-3 text-sm">
              <p>아이디: {u.username}</p>
              <p>닉네임: {u.nickname}</p>
              <p>권한: {u.isAdmin ? "관리자" : "일반회원"}</p>
              <p>가입일: {new Date(u.createdAt).toLocaleString("ko-KR")}</p>
              <p>현금 잔고: {Math.round(account?.cashBalance ?? 0).toLocaleString()}원</p>
              <p>보유 종목 수: {holdings.length}</p>
              <p>거래 횟수: {trades.length}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
