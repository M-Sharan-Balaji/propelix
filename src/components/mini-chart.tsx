interface MiniChartProps {
  values: number[];
}

export function MiniChart({ values }: MiniChartProps) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / Math.max(1, max - min)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="mini-chart" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
