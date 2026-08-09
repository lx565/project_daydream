// Solo readings use the raw sessionId as their chartId; the hepan (couple) flow
// prefixes it with "hepan_" (see components/HepanFlow.tsx). This is the single
// source of truth for turning a chartId back into its flow type, so the
// purchase / checkout / paywall analytics can segment hepan vs solo revenue and
// funnel without prefix-matching transaction_ids by hand.
export type ChartType = "hepan" | "solo";

export function chartType(chartId: string): ChartType {
  return chartId.startsWith("hepan_") ? "hepan" : "solo";
}
