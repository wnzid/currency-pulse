import type { ExchangeRateSnapshot } from "../types/exchange";

export interface RateStatistics {
  highest: number | null;
  lowest: number | null;
  average: number | null;
  totalSnapshots: number;
  firstSnapshot: string | null;
  latestSnapshot: string | null;
}

export function computeRateStatistics(
  history: ExchangeRateSnapshot[],
  targetCurrency: string,
): RateStatistics {
  const totalSnapshots = history.length;

  if (totalSnapshots === 0) {
    return {
      highest: null,
      lowest: null,
      average: null,
      totalSnapshots: 0,
      firstSnapshot: null,
      latestSnapshot: null,
    };
  }

  const sortedByTime = [...history].sort(
    (left, right) =>
      new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime(),
  );

  const firstSnapshot = sortedByTime[0]?.observedAt ?? null;
  const latestSnapshot = sortedByTime[sortedByTime.length - 1]?.observedAt ?? null;

  const values = history
    .map((snapshot) => snapshot.rates[targetCurrency])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) {
    return {
      highest: null,
      lowest: null,
      average: null,
      totalSnapshots,
      firstSnapshot,
      latestSnapshot,
    };
  }

  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    highest,
    lowest,
    average,
    totalSnapshots,
    firstSnapshot,
    latestSnapshot,
  };
}
