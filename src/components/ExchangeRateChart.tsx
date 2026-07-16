import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExchangeRateSnapshot } from "../types/exchange";
import { formatRate } from "../utils/currency";

interface ExchangeRateChartProps {
  snapshots: ExchangeRateSnapshot[];
  targetCurrency: string;
}

export function ExchangeRateChart({
  snapshots,
  targetCurrency,
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
      <div className="section-heading">
        <h2>Historical trend</h2>
        <p>
          {chartData.length} points for EUR to {targetCurrency}
        </p>
      </div>
      <div className="chart-wrap" aria-label="Exchange rate line chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="var(--grid)" strokeDasharray="4 4" />
            <XAxis dataKey="label" minTickGap={24} stroke="var(--text-muted)" />
            <YAxis
              stroke="var(--text-muted)"
              tickFormatter={(value: number) => value.toFixed(2)}
              width={72}
            />
            <Tooltip
              formatter={(value) => [formatRate(typeof value === "number" ? value : undefined), targetCurrency]}
              labelFormatter={(label) => `Observed: ${label}`}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
              }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
