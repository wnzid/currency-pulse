import type { LatestSnapshotData } from "../types/exchange";
import { formatDate, formatTime } from "../utils/currency";

interface DashboardHeaderProps {
  latest: LatestSnapshotData;
}

export function DashboardHeader({ latest }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header card">
      <div className="header-copy">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">CP</span>
          <p className="eyebrow">Currency Pulse / Live desk</p>
        </div>
        <h1>Money moves.<br /><span>We track it.</span></h1>
        <p className="header-deck">A sharper view of global exchange rates, historical shifts, and the numbers behind every move.</p>
      </div>
      <div className="header-meta">
        <span className="live-indicator"><i /> System live</span>
        <p className="meta-label">Latest observation</p>
        <p className="meta-value">{formatDate(latest.observedAt)}</p>
        <p className="meta-subtle">{formatTime(latest.observedAt)}</p>
      </div>
    </header>
  );
}
