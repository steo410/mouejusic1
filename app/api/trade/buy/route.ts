import { revalidatePath } from "next/cache";

// ...기존 로직 유지

revalidatePath("/mypage");
revalidatePath("/admin");
revalidatePath(`/stock/${normalizedSymbol}`);

return NextResponse.json(
  { message: "매수 완료", symbol: normalizedSymbol, price, quantity, fee, cashBalance: nextCash },
  { headers: { "Cache-Control": "no-store" } }
);
