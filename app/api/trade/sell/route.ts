import { getAdminUser } from "@/lib/demo-db";
import { revalidatePath } from "next/cache";

// ...매도 처리 후

const admin = getAdminUser();
if (admin && admin.id !== user.id) {
  const adminAccount = getAccount(admin.id);
  if (adminAccount) {
    setCash(admin.id, adminAccount.cashBalance + fee);
  }
}

revalidatePath("/mypage");
revalidatePath("/admin");
revalidatePath(`/stock/${normalizedSymbol}`);

return NextResponse.json(
  { message: "매도 완료", symbol: normalizedSymbol, price, quantity, fee, cashBalance: account.cashBalance + net },
  { headers: { "Cache-Control": "no-store" } }
);
