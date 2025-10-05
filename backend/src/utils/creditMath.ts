const CREDIT_SCALE = 10000;
const EPSILON = 1e-8;

export function roundCredit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const scaled = Math.round(value * CREDIT_SCALE);
  const rounded = scaled / CREDIT_SCALE;
  return Math.abs(rounded) < 1 / CREDIT_SCALE ? 0 : rounded;
}

export function formatCredit(value: number): string {
  return roundCredit(value).toFixed(4);
}

export function hasSufficientCredits(balance: number, cost: number): boolean {
  return roundCredit(balance) + EPSILON >= roundCredit(cost);
}

export function normalizeTokenCount(value: number | null | undefined): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.ceil(numeric);
}
