type HeatmapPoint = {
  activity_hour: number;
  actions_count: number;
};

type HeatmapChartProps = {
  data: HeatmapPoint[];
  title?: string;
};

export function HeatmapChart({ data, title = 'Активность по часам' }: HeatmapChartProps) {
  const max = data.reduce((acc, item) => Math.max(acc, item.actions_count), 0);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const valueByHour = new Map<number, number>(data.map((d) => [d.activity_hour, d.actions_count]));

  const intensity = (count: number) => {
    if (max === 0) return 0.05;
    const ratio = count / max;
    return Math.max(0.1, Math.min(0.9, ratio));
  };

  return (
    <div className="card p-4">
      <div className="text-sm font-semibold text-slate-900 mb-2">{title}</div>
      <div className="grid grid-cols-6 gap-2">
        {hours.map((hour) => {
          const count = valueByHour.get(hour) || 0;
          const opacity = intensity(count);
          return (
            <div key={hour} className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded border border-slate-200"
                style={{ backgroundColor: `rgba(15, 23, 42, ${opacity})` }}
                title={`${hour}:00 — ${count}`}
              />
              <div className="text-[10px] text-slate-500 mt-1">{String(hour).padStart(2, '0')}</div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-slate-500 mt-3">Интенсивность соответствует количеству действий</div>
    </div>
  );
}
