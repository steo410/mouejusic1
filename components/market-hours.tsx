"use client";

export function MarketHours() {
  return (
    <section className="rounded-lg border border-slate-800 p-4 text-sm text-slate-300">
      <h2 className="font-semibold text-slate-100">시장 시간 안내</h2>
      <p>한국: 평일 09:00 ~ 15:30 (KST)</p>
      <p>미국(정규장): 평일 09:30 ~ 16:00 (ET)</p>
      <p className="mt-2 text-emerald-300">모의투자 거래는 시간과 무관하게 24시간 가능합니다.</p>
    </section>
  );
}
