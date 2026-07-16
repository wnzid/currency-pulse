import type { LatestSnapshotData } from "../types/exchange";
import { formatRate } from "../utils/currency";

interface RateCardProps {
  baseCurrency: string;
  targetCurrency: string;
  latest: LatestSnapshotData;
}

export function RateCard({
  baseCurrency,
  targetCurrency,
  latest,
}: RateCardProps) {
  const rate = latest.rates[targetCurrency];
  const hasData = typeof rate === "number";

  return (
    <article className="rate-card card">
      <div className="rate-card-top">
        <p className="pair">
          {baseCurrency} to {targetCurrency}
        </p>
        <span
          className={`status-chip ${hasData ? "status-available" : "status-missing"}`}
        >
          {hasData ? "Data available" : "No data"}
        </span>
      </div>
      <p className="rate-value">{formatRate(rate)}</p>
      <p className="card-subtle">
        Source date: {latest.rateDate ?? "Unknown"}
      </p>
    </article>
  );
}
