import { listTrades as listDemoTrades } from "@/lib/demo-db";

export function listTrades(userId: string) {
  return listDemoTrades(userId);
}
