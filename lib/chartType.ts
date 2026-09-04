// Solo readings use the raw sessionId as their chartId; the hepan (couple) flow
// prefixes it with "hepan_" (see components/HepanFlow.tsx), the monthly
// fortune flow prefixes it with "yueyun_" (see components/MonthlyFortuneFlow.tsx),
// and the annual reading flow prefixes it with "niandu_" (see
// components/NianduFlow.tsx). niandu_ intentionally maps to the SAME
// ChartType ("monthly") as yueyun_ — 年度解讀 reuses 逐月運勢's price, Stripe
// Price ID, and paywall-disabled-type behavior byte-for-byte; it is a content
// swap, not a new billing product.
// This is the single source of truth for turning a chartId back into its flow
// type, so purchase / checkout / paywall analytics can segment revenue and
// funnel by product without prefix-matching transaction_ids by hand.
export type ChartType = "hepan" | "solo" | "monthly";

const PREFIX_TYPE: Array<readonly [prefix: string, type: ChartType]> = [
  ["hepan_", "hepan"],
  ["yueyun_", "monthly"],
  ["niandu_", "monthly"],
];

export function chartType(chartId: string): ChartType {
  for (const [prefix, type] of PREFIX_TYPE) {
    if (chartId.startsWith(prefix)) return type;
  }
  return "solo";
}

// USD price per chart type — single source of truth for GA purchase-value
// tracking (lib/usePaywall.ts) and the displayed price in the paywall UI
// (components/PaywallLock.tsx), so a new product's price can't drift between
// the two the way a hardcoded "$6.99" string would.
export const CHART_PRICE_USD: Record<ChartType, number> = {
  solo: 6.99,
  hepan: 6.99,
  monthly: 1.99,
};
