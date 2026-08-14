import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExchangeRateSnapshot } from "../types/exchange";
import type { TimeRangeValue } from "../types/exchange";
import { formatRate } from "../utils/currency";
import { TimeRangeSelector } from "./TimeRangeSelector";

interface ExchangeRateChartProps {
  snapshots: ExchangeRateSnapshot[];
  baseCurrency: string;
  targetCurrency: string;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (range: TimeRangeValue) => void;
}

export function ExchangeRateChart({
  snapshots,
  baseCurrency,
  targetCurrency,
  timeRange,
  onTimeRangeChange,
}: ExchangeRateChartProps) {
  const chartData = snapshots
    .map((snapshot) => ({
      observedAt: snapshot.observedAt,
      label: new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(snapshot.observedAt)),
      rate: snapshot.rates[targetCurrency],
    }))
    .filter((point) => typeof point.rate === "number");

  const rates = chartData.map((point) => point.rate);
  const minimumRate = Math.min(...rates);
  const maximumRate = Math.max(...rates);
  const rateRange = maximumRate - minimumRate;
  const domainPadding =
    rateRange > 0
      ? rateRange * 0.1
      : Math.max(Math.abs(minimumRate) * 0.0001, 0.000001);
  const yAxisDomain: [number, number] = [
    minimumRate - domainPadding,
    maximumRate + domainPadding,
  ];
  const tickPrecision = Math.min(
    8,
    Math.max(2, Math.ceil(-Math.log10(rateRange || domainPadding)) + 1),
  );
  const firstRate = rates[0];
  const latestRate = rates[rates.length - 1];
  const rateChange = latestRate - firstRate;
  const percentageChange = firstRate === 0 ? 0 : (rateChange / firstRate) * 100;
  const trendDirection = rateChange > 0 ? "up" : rateChange < 0 ? "down" : "flat";

  if (chartData.length < 2) {
    return (
      <section className="card chart-empty-state">
        <h2>Historical trend</h2>
        <p>
          Not enough data points yet for {targetCurrency}. Collect more snapshots to
          render this chart.
        </p>
      </section>
    );
  }

  return (
    <section className="card chart-section">
      <div className="chart-header">
        <div>
          <p className="chart-kicker">Exchange rate</p>
          <h2>1 {baseCurrency} <span>=</span> {formatRate(latestRate)} {targetCurrency}</h2>
          <div className="chart-delta">
            <strong>{rateChange > 0 ? "+" : ""}{rateChange.toFixed(tickPrecision)} {targetCurrency}</strong>
            <span className={`trend-text trend-${trendDirection}`}>
              {rateChange > 0 ? "UP" : rateChange < 0 ? "DOWN" : "FLAT"} {Math.abs(percentageChange).toFixed(3)}%
            </span>
          </div>
        </div>
        <div className="chart-range-summary">
          <span>{timeRange === "all" ? "All recorded data" : timeRange}</span>
          <strong>{chartData.length} observations</strong>
        </div>
      </div>
      <div className="chart-wrap" aria-label="Exchange rate line chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--blue)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="3 6" />
            <XAxis dataKey="label" minTickGap={42} stroke="var(--text-muted)" tickLine={false} axisLine={false} />
            <YAxis
              domain={yAxisDomain}
              stroke="var(--text-muted)"
              width={82}
              tickLine={false}
              axisLine={false}
              tickCount={5}
              orientation="right"
              tickFormatter={(value: number) => value.toFixed(tickPrecision)}
            />
            <Tooltip
              formatter={(value) => [formatRate(typeof value === "number" ? value : undefined), targetCurrency]}
              labelFormatter={(label) => `Observed: ${label}`}
              contentStyle={{
                borderRadius: "0",
                border: "3px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                boxShadow: "4px 4px 0 var(--ink)",
              }}
            />
            <ReferenceLine
              y={latestRate}
              stroke="var(--blue)"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: formatRate(latestRate), position: "right", fill: "var(--blue)", fontSize: 11, fontWeight: 700 }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="var(--blue)"
              fill="url(#rateFill)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: "var(--yellow)", stroke: "var(--ink)", strokeWidth: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footer">
        <p>Hover or tap for exact observations.</p>
        <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
      </div>
    </section>
  );
}
