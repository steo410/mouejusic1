export const FEE_RATE = 0.001;
export const MIN_BUY_KRW = 1000;

export function buyCost(amountKrw: number) {
  const fee = amountKrw * FEE_RATE;
  return { fee, total: amountKrw + fee };
}

export function sellRevenue(price: number, quantity: number) {
  const gross = price * quantity;
  const fee = gross * FEE_RATE;
  return { fee, net: gross - fee };
}
