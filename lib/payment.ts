// Payment methods for expenses. Values are stored on transactions.payment_method;
// labels are shown in the UI. Keep the values in sync with the `paymentMethod`
// enum in lib/schemas.ts.
export const PAYMENT_METHODS = [
  { value: "gcash", label: "GCash" },
  { value: "cash", label: "Cash" },
  { value: "bank_qr", label: "Bank QR" },
] as const;

export function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? "Cash";
}
