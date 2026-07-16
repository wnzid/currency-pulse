import type {
  ExchangeRateSnapshot,
  LatestSnapshotData,
  TimeRangeOption,
  TimeRangeValue,
} from "../types/exchange";

export const TRACKED_CURRENCIES = [
  "AUD",
  "BDT",
  "USD",
  "GBP",
  "CAD",
  "CHF",
  "JPY",
] as const;

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

const RANGE_TO_MS: Record<Exclude<TimeRangeValue, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export const EMPTY_LATEST: LatestSnapshotData = {
  observedAt: null,
  rateDate: null,
  base: "EUR",
  rates: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRates(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, number>>((acc, [key, rate]) => {
    if (key.length > 0 && typeof rate === "number" && Number.isFinite(rate)) {
      acc[key] = rate;
    }

    return acc;
  }, {});
}

export function normalizeLatestSnapshot(value: unknown): LatestSnapshotData {
  if (!isRecord(value)) {
    return EMPTY_LATEST;
  }

  const observedAt = typeof value.observedAt === "string" ? value.observedAt : null;
  const rateDate = typeof value.rateDate === "string" ? value.rateDate : null;
  const base = typeof value.base === "string" && value.base ? value.base : "EUR";
  const source = typeof value.source === "string" ? value.source : undefined;

  return {
    observedAt,
    rateDate,
    base,
    rates: normalizeRates(value.rates),
    source,
  };
}

export function normalizeHistory(value: unknown): ExchangeRateSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      observedAt: typeof item.observedAt === "string" ? item.observedAt : "",
      rateDate: typeof item.rateDate === "string" ? item.rateDate : "",
      base: typeof item.base === "string" && item.base ? item.base : "EUR",
      rates: normalizeRates(item.rates),
      source: "Frankfurter" as const,
    }))
    .filter((snapshot) => snapshot.observedAt.length > 0);
}

export function sortSnapshotsAscending(
  snapshots: ExchangeRateSnapshot[],
): ExchangeRateSnapshot[] {
  return [...snapshots].sort(
    (left, right) =>
      new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime(),
  );
}

export function filterHistoryByTimeRange(
  snapshots: ExchangeRateSnapshot[],
  timeRange: TimeRangeValue,
): ExchangeRateSnapshot[] {
  if (timeRange === "all") {
    return snapshots;
  }

  const now = Date.now();
  const threshold = now - RANGE_TO_MS[timeRange];

  return snapshots.filter((snapshot) => {
    const timestamp = new Date(snapshot.observedAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= threshold;
  });
}

export function getAvailableCurrencies(
  latest: LatestSnapshotData,
  history: ExchangeRateSnapshot[],
): string[] {
  const currencies = new Set<string>([latest.base]);

  Object.keys(latest.rates).forEach((currency) => currencies.add(currency));

  history.forEach((snapshot) => {
    currencies.add(snapshot.base);
    Object.keys(snapshot.rates).forEach((currency) => currencies.add(currency));
  });

  return [...currencies].sort((left, right) => left.localeCompare(right));
}

export function formatRate(rate: number | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    return "Unavailable";
  }

  return rate.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "Unknown";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) {
    return "Unknown";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return `${
    new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date)
  } UTC`;
}
