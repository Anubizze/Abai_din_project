import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type GrowthPoint = {
  activity_date: string;
  total_users: number;
};

type GrowthChartProps = {
  data: GrowthPoint[];
  title?: string;
};

export function GrowthChart({ data, title = 'Рост базы пользователей' }: GrowthChartProps) {
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
            <Line type="monotone" dataKey="total_users" stroke="#1e293b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
