import { useMemo, useState } from "react";
import { CurrencyConverter } from "../components/CurrencyConverter";
import { CurrencySelector } from "../components/CurrencySelector";
import { DashboardHeader } from "../components/DashboardHeader";
import { ExchangeRateChart } from "../components/ExchangeRateChart";
import { RateCard } from "../components/RateCard";
import { SnapshotTable } from "../components/SnapshotTable";
import { StatisticsCard } from "../components/StatisticsCard";
import { TimeRangeSelector } from "../components/TimeRangeSelector";
import { useExchangeRates } from "../hooks/useExchangeRates";
import type { TimeRangeValue } from "../types/exchange";
import {
  TRACKED_CURRENCIES,
  filterHistoryByTimeRange,
  formatDate,
  formatRate,
  formatTime,
  getAvailableCurrencies,
  sortSnapshotsAscending,
} from "../utils/currency";
import { computeRateStatistics } from "../utils/statistics";

export function Dashboard() {
  const { latest, history, loading, error } = useExchangeRates();

  const [chartBaseCurrency, setChartBaseCurrency] = useState("EUR");
  const [chartTargetCurrency, setChartTargetCurrency] = useState("BDT");
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("30d");

  const sortedHistory = useMemo(() => sortSnapshotsAscending(history), [history]);

  const availableCurrencies = useMemo(
    () => getAvailableCurrencies(latest, sortedHistory),
    [latest, sortedHistory],
  );

  const effectiveChartBaseCurrency = availableCurrencies.includes(chartBaseCurrency)
    ? chartBaseCurrency
    : (availableCurrencies[0] ?? latest.base);

  const effectiveChartTargetCurrency = availableCurrencies.includes(chartTargetCurrency)
    ? chartTargetCurrency
    : (availableCurrencies.includes("BDT")
        ? "BDT"
        : (availableCurrencies[0] ?? latest.base));

  const rangedHistory = useMemo(
    () => filterHistoryByTimeRange(sortedHistory, timeRange),
    [sortedHistory, timeRange],
  );

  const chartHistory = useMemo(
    () =>
      rangedHistory
        .filter((snapshot) => {
          const hasTarget = typeof snapshot.rates[effectiveChartTargetCurrency] === "number";
          const hasBase =
            effectiveChartBaseCurrency === snapshot.base ||
            typeof snapshot.rates[effectiveChartBaseCurrency] === "number";
          return hasTarget && hasBase;
        })
        .map((snapshot) => {
          if (effectiveChartBaseCurrency === snapshot.base) {
            return snapshot;
          }

          const baseRate = snapshot.rates[effectiveChartBaseCurrency];
          const targetRate = snapshot.rates[effectiveChartTargetCurrency];

          if (
            typeof baseRate !== "number" ||
            !Number.isFinite(baseRate) ||
            typeof targetRate !== "number" ||
            !Number.isFinite(targetRate)
          ) {
            return null;
          }

          return {
            ...snapshot,
            rates: {
              ...snapshot.rates,
              [effectiveChartTargetCurrency]: targetRate / baseRate,
            },
          };
        })
        .filter((snapshot) => snapshot !== null),
    [rangedHistory, effectiveChartTargetCurrency, effectiveChartBaseCurrency],
  );

  const statistics = useMemo(
    () => computeRateStatistics(chartHistory, effectiveChartTargetCurrency),
    [chartHistory, effectiveChartTargetCurrency],
  );

  return (
    <main className="dashboard-shell">
      <DashboardHeader latest={latest} />

      {error ? <p className="inline-alert">{error}</p> : null}

      {loading ? (
        <section className="card loading-card">
          <p>Loading dashboard data...</p>
        </section>
      ) : null}

      <section className="rates-grid">
        {TRACKED_CURRENCIES.map((currency) => (
          <RateCard
            key={currency}
            baseCurrency={latest.base}
            targetCurrency={currency}
            latest={latest}
          />
        ))}
      </section>

      <section className="card controls-card">
        <div className="controls-grid">
          <CurrencySelector
            id="chart-base"
            label="Base currency"
            value={effectiveChartBaseCurrency}
            options={availableCurrencies}
            onChange={setChartBaseCurrency}
          />
          <CurrencySelector
            id="chart-target"
            label="Target currency"
            value={effectiveChartTargetCurrency}
            options={availableCurrencies}
            onChange={setChartTargetCurrency}
          />
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </section>

      <ExchangeRateChart
        snapshots={chartHistory}
        targetCurrency={effectiveChartTargetCurrency}
      />

      <section className="stats-grid">
        <StatisticsCard
          title={`Highest rate (${effectiveChartTargetCurrency})`}
          value={formatRate(statistics.highest ?? undefined)}
        />
        <StatisticsCard
          title={`Lowest rate (${effectiveChartTargetCurrency})`}
          value={formatRate(statistics.lowest ?? undefined)}
        />
        <StatisticsCard
          title={`Average rate (${effectiveChartTargetCurrency})`}
          value={formatRate(statistics.average ?? undefined)}
        />
        <StatisticsCard
          title="Total snapshots"
          value={statistics.totalSnapshots.toLocaleString()}
        />
        <StatisticsCard
          title="First snapshot"
          value={`${formatDate(statistics.firstSnapshot)} ${formatTime(statistics.firstSnapshot)}`}
        />
        <StatisticsCard
          title="Latest snapshot"
          value={`${formatDate(statistics.latestSnapshot)} ${formatTime(statistics.latestSnapshot)}`}
        />
      </section>

      <section className="latest-grid">
        <article className="card latest-card">
          <h2>Latest snapshot</h2>
          <dl>
            <div>
              <dt>Observed At</dt>
              <dd>{latest.observedAt ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Rate Date</dt>
              <dd>{latest.rateDate ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{latest.source ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Base Currency</dt>
              <dd>{latest.base}</dd>
            </div>
            <div>
              <dt>Total currencies stored</dt>
              <dd>{Object.keys(latest.rates).length.toLocaleString()}</dd>
            </div>
          </dl>
        </article>

        <CurrencyConverter latest={latest} currencies={availableCurrencies} />
      </section>

      <SnapshotTable history={sortedHistory} trackedCurrencies={TRACKED_CURRENCIES} />
    </main>
  );
}
