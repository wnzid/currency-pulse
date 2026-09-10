import { useEffect, useState } from "react";
import type { ExchangeRatesState } from "../types/exchange";
import {
  EMPTY_LATEST,
  normalizeHistory,
  normalizeLatestSnapshot,
  resolveLatestSnapshot,
} from "../utils/currency";
import { publicAssetPath } from "../utils/assets";

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error(`${path} contains malformed JSON`);
  }
}

export function useExchangeRates(): ExchangeRatesState {
  const [latest, setLatest] = useState(EMPTY_LATEST);
  const [history, setHistory] = useState<ExchangeRatesState["history"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      setLoading(true);

      const [latestResult, historyResult] = await Promise.allSettled([
        fetchJson(publicAssetPath("data/latest.json")),
        fetchJson(publicAssetPath("data/history.json")),
      ]);

      if (cancelled) {
        return;
      }

      const errors: string[] = [];

      const normalizedLatest = latestResult.status === "fulfilled"
        ? normalizeLatestSnapshot(latestResult.value)
        : EMPTY_LATEST;
      const normalizedHistory = historyResult.status === "fulfilled"
        ? normalizeHistory(historyResult.value)
        : [];

      if (latestResult.status === "rejected") {
        errors.push("Latest snapshot could not be loaded.");
      }

      if (historyResult.status === "rejected") {
        errors.push("History data could not be loaded.");
      }

      setLatest(resolveLatestSnapshot(normalizedLatest, normalizedHistory));
      setHistory(normalizedHistory);

      setError(errors.length > 0 ? errors.join(" ") : null);
      setLoading(false);
    }

    loadData().catch(() => {
      if (cancelled) {
        return;
      }

      setLatest(EMPTY_LATEST);
      setHistory([]);
      setError("Dashboard data could not be loaded.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    latest,
    history,
    loading,
    error,
  };
}
