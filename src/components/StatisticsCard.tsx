interface StatisticsCardProps {
  title: string;
  value: string;
}

export function StatisticsCard({ title, value }: StatisticsCardProps) {
  return (
    <article className="card statistic-card">
      <p className="card-subtle">{title}</p>
      <p className="stat-value">{value}</p>
    </article>
  );
}
