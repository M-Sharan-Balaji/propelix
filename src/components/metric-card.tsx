import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "warning";
  icon?: ReactNode;
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        {icon ? <span className="metric-card__icon">{icon}</span> : null}
      </div>
      <strong className="metric-card__value">{value}</strong>
      <p className="metric-card__hint">{hint}</p>
    </article>
  );
}
