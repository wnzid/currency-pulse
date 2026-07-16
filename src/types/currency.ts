export interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ExchangeRateSnapshot {
  observedAt: string;
  rateDate: string;
  base: string;
  rates: Record<string, number>;
  source: "Frankfurter";
}
