import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccount, listHoldings, listTrades, listUsers } from "@/lib/demo-db";
import { getChart, getQuote } from "@/lib/finance";
import { AdminGiftForm } from "@/components/admin-gift-form";

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
        stockValue
      };
    })
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">관리자 페이지</h1>
      <p className="text-sm text-slate-400">회원 상세 정보 (관리자 전용)</p>
      <div className="space-y-3">
        {rows.map(({ user, account, holdings, trades, stockValue }) => {
          return (
            <section key={user.id} className="rounded border border-slate-800 p-3 text-sm">
              <p>아이디: {user.username}</p>
              <p>닉네임: {user.nickname}</p>
              <p>비밀번호(해시): {user.passwordHash || "-"}</p>
              <p>권한: {user.isAdmin ? "관리자" : "일반회원"}</p>
              <p>가입일: {new Date(user.createdAt).toLocaleString("ko-KR")}</p>
              <p>현금 잔고: {Math.round(account?.cashBalance ?? 0).toLocaleString()}원</p>
              <p>주식 평가금: {Math.round(stockValue).toLocaleString()}원</p>
              <p>보유 종목 수: {holdings.length}</p>
              <p>거래 횟수: {trades.length}</p>
              <AdminGiftForm userId={user.id} />
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
