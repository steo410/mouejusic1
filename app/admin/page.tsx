import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccount, listHoldings, listTrades, listUsers } from "@/lib/demo-db";
import { getChart, getQuote } from "@/lib/finance";
import { AdminGiftForm } from "@/components/admin-gift-form";
import { AdminDeleteButton } from "@/components/admin-delete-button";

export default async function AdminPage() {
  const me = await requireUser();
  if (!me || !me.isAdmin) {
    redirect("/");
  }

  const users = await listUsers();
  const normalUsers = users.filter((u) => !u.isAdmin);
  const rows = await Promise.all(
    normalUsers.map(async (u) => {
      const holdings = await listHoldings(u.id);
      let stockValue = 0;
      for (const h of holdings) {
        let price = 0;
        try {
          const quote = await getQuote(h.symbol);
          price = Number(quote.regularMarketPrice);
        } catch {
          try {
            const chart = await getChart(h.symbol, "1d");
            price = [...chart.quotes].reverse().find((x) => Number.isFinite(x.close) && (x.close ?? 0) > 0)?.close ?? 0;
          } catch {
            price = 0;
          }
        }
        if (Number.isFinite(price) && price > 0) {
          stockValue += price * h.quantity;
        }
      }
      return {
        user: u,
        account: await getAccount(u.id),
        holdings,
        trades: await listTrades(u.id),
        stockValue,
      };
    })
  );

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">관리자 페이지</h1>
      <p className="text-sm text-slate-400">회원 상세 정보 (관리자 전용)</p>
      <div className="space-y-3">
        {rows.map(({ user, account, holdings, trades, stockValue }) => {
          const totalAsset = Math.round((account?.cashBalance ?? 0) + stockValue);
          return (
            <section key={user.id} className="rounded border border-slate-800 p-3 text-sm space-y-1">
              <p><span className="text-slate-400">아이디:</span> {user.username}</p>
              <p><span className="text-slate-400">닉네임:</span> {user.nickname}</p>
              <p>
                <span className="text-slate-400">비밀번호:</span>{" "}
                <span className="text-yellow-400 text-xs">
                  bcrypt 암호화됨 — 분실 시 관리자가 임시 비밀번호로 재설정 필요
                </span>
              </p>
              <p><span className="text-slate-400">권한:</span> {user.isAdmin ? "관리자" : "일반회원"}</p>
              <p><span className="text-slate-400">가입일 (KST):</span> {toKST(user.createdAt)}</p>
              <p><span className="text-slate-400">현금 잔고:</span> {Math.round(account?.cashBalance ?? 0).toLocaleString()}원</p>
              <p><span className="text-slate-400">주식 평가금:</span> {Math.round(stockValue).toLocaleString()}원</p>
              <p><span className="text-slate-400">총 자산:</span> <span className="font-semibold text-emerald-400">{totalAsset.toLocaleString()}원</span></p>
              <p><span className="text-slate-400">보유 종목 수:</span> {holdings.length}</p>
              <p><span className="text-slate-400">거래 횟수:</span> {trades.length}</p>
              <AdminGiftForm userId={user.id} />
              <AdminDeleteButton userId={user.id} username={user.username} />
            </section>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-slate-400">표시할 일반회원이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
