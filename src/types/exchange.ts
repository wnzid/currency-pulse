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

export interface LatestSnapshotData {
  observedAt: string | null;
  rateDate: string | null;
  base: string;
  rates: Record<string, number>;
  source?: string;
}

export type TimeRangeValue = "24h" | "7d" | "30d" | "90d" | "all";

export interface TimeRangeOption {
  value: TimeRangeValue;
  label: string;
}

export interface ExchangeRatesState {
  latest: LatestSnapshotData;
  history: ExchangeRateSnapshot[];
  loading: boolean;
  error: string | null;
}
