import type { LatestSnapshotData } from "../types/exchange";
import { formatDate, formatTime } from "../utils/currency";

interface DashboardHeaderProps {
  latest: LatestSnapshotData;
}

export function DashboardHeader({ latest }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header card">
      <div>
        <p className="eyebrow">Currency Pulse</p>
        <h1>Historical Exchange Rate Observatory</h1>
      </div>
      <div className="header-meta">
        <p className="meta-label">Last updated</p>
        <p className="meta-value">{formatDate(latest.observedAt)}</p>
        <p className="meta-subtle">{formatTime(latest.observedAt)}</p>
      </div>
    </header>
  );
}
