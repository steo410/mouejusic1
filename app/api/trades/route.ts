// app/api/trades/route.ts
return NextResponse.json(listTrades(user.id), { headers: { "Cache-Control": "no-store" } });
