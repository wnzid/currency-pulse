import { useMemo, useState } from "react";
import type { ExchangeRateSnapshot } from "../types/exchange";

interface SnapshotTableProps {
  history: ExchangeRateSnapshot[];
  trackedCurrencies: readonly string[];
}

export function SnapshotTable({
  history,
  trackedCurrencies,
}: SnapshotTableProps) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const sorted = [...history].sort(
      (left, right) =>
        new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime(),
    );

    const filtered = normalizedQuery
      ? sorted.filter((snapshot) => {
          const searchableText = [
            snapshot.observedAt,
            snapshot.rateDate,
            snapshot.base,
            ...trackedCurrencies.map((currency) => `${snapshot.rates[currency] ?? ""}`),
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(normalizedQuery);
        })
      : sorted;

    return filtered.slice(0, 50);
  }, [history, query, trackedCurrencies]);

  return (
    <section className="card table-section">
      <div className="table-header">
        <h2>Snapshot history</h2>
        <input
          type="search"
          placeholder="Search snapshots..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search snapshots"
        />
      </div>

      {rows.length === 0 ? (
        <p className="empty-copy">No snapshots match your search.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Observed time</th>
                <th>Rate date</th>
                <th>Base</th>
                {trackedCurrencies.map((currency) => (
                  <th key={currency}>{currency}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((snapshot) => (
                <tr key={snapshot.observedAt}>
                  <td>{snapshot.observedAt}</td>
                  <td>{snapshot.rateDate}</td>
                  <td>{snapshot.base}</td>
                  {trackedCurrencies.map((currency) => (
                    <td key={`${snapshot.observedAt}-${currency}`}>
                      {typeof snapshot.rates[currency] === "number"
                        ? snapshot.rates[currency].toFixed(4)
                        : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
