export function parseAmountToCentavos(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatCentavos(centavos: number, opts?: { symbol?: boolean }): string {
  const symbol = opts?.symbol ?? true;
  const amount = (centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `₱${amount}` : amount;
}
