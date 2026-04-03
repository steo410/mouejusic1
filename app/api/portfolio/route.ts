// app/api/portfolio/route.ts
return NextResponse.json(
  { rows, cashBalance: account?.cashBalance ?? 0, totalAsset: (account?.cashBalance ?? 0) + totalStockValue },
  { headers: { "Cache-Control": "no-store" } }
);
