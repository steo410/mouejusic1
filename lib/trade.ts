export const FEE_RATE = 0.001;
export const MIN_BUY_KRW = 1000;
export const MIN_FEE_KRW = 1;

export function buyCost(amountKrw: number) {
  const fee = Math.max(MIN_FEE_KRW, amountKrw * FEE_RATE);
  return { fee, total: amountKrw + fee };
}

export function sellRevenue(price: number, quantity: number) {
  const gross = price * quantity;
  const fee = Math.max(MIN_FEE_KRW, gross * FEE_RATE);
  return { fee, net: gross - fee };
}
