import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type ActivityPoint = {
  activity_date: string;
  actions_count: number;
};

type ActivityChartProps = {
  data: ActivityPoint[];
  title?: string;
};

export function ActivityChart({ data, title = 'Активность по дням' }: ActivityChartProps) {
  const formatDateLabel = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const formatDateTooltip = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <div className="text-sm font-semibold text-slate-900 mb-2">{title}</div>
        <div className="text-xs text-slate-500">Нет данных за выбранный период</div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="text-sm font-semibold text-slate-900 mb-2">{title}</div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="activity_date" tick={{ fontSize: 10 }} tickFormatter={formatDateLabel} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={formatDateTooltip} />
            <Line type="monotone" dataKey="actions_count" stroke="#0f172a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
