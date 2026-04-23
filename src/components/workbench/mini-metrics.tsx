interface MetricDatum {
  label: string;
  value: number;
}

interface MiniMetricsProps {
  title: string;
  subtitle: string;
  items: MetricDatum[];
}

export function MiniMetrics({ title, subtitle, items }: MiniMetricsProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="workbench-shell__signal-card">
      <span>{title}</span>
      <strong>{subtitle}</strong>
      <div className="workbench-shell__mini-metrics">
        {items.map((item) => (
          <div key={item.label} className="workbench-shell__mini-metric-row">
            <small>{item.label}</small>
            <div className="workbench-shell__mini-metric-track" aria-hidden="true">
              <div
                className="workbench-shell__mini-metric-fill"
                style={{ width: `${Math.max((item.value / maxValue) * 100, 14)}%` }}
              />
            </div>
            <small>{item.value}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MiniMetrics;
