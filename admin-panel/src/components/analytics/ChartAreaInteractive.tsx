'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export type DailyActivityPoint = { activity_date: string; total_actions: number };
export type GrowthPoint = { activity_date: string; total_users: number };

type ChartAreaInteractiveProps = {
  dailyActivity: DailyActivityPoint[];
  growthData: GrowthPoint[];
};

function mergeChartData(
  daily: DailyActivityPoint[],
  growth: GrowthPoint[]
): Array<{ date: string; actions: number; users: number }> {
  const byDate = new Map<string, { actions: number; users: number }>();
  daily.forEach((d) => {
    byDate.set(d.activity_date, {
      actions: d.total_actions ?? 0,
      users: byDate.get(d.activity_date)?.users ?? 0,
    });
  });
  growth.forEach((g) => {
    const cur = byDate.get(g.activity_date) ?? { actions: 0, users: 0 };
    cur.users = g.total_users ?? 0;
    byDate.set(g.activity_date, cur);
  });
  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function ChartAreaInteractive({ dailyActivity, growthData }: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('30d');

  const fullData = React.useMemo(
    () => mergeChartData(dailyActivity, growthData),
    [dailyActivity, growthData]
  );

  const filteredData = React.useMemo(() => {
    if (fullData.length === 0) return [];
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const lastDataDate = new Date(fullData[fullData.length - 1].date);
    const endDate = new Date(lastDataDate.getFullYear(), lastDataDate.getMonth(), lastDataDate.getDate());
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (daysCount - 1));
    const dataByDate = new Map<string, { actions: number; users: number }>();
    fullData.forEach((item) => {
      dataByDate.set(item.date, { actions: item.actions, users: item.users });
    });
    const result: Array<{ date: string; actions: number; users: number }> = [];
    let lastUsers = 0;
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const point = dataByDate.get(dateStr);
      const actions = point ? point.actions : 0;
      const users = point ? point.users : lastUsers;
      if (point) lastUsers = point.users;
      result.push({ date: dateStr, actions, users });
    }
    return result;
  }, [fullData, timeRange]);

  const formatDateLabel = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  };

  const formatDateTooltip = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (fullData.length === 0) {
    return (
      <div className="card p-6 pt-0">
        <div className="border-b border-slate-200 py-5">
          <h3 className="text-lg font-semibold text-slate-900">Пользователей — Действия</h3>
          <p className="text-sm text-slate-500 mt-1">Те же пользователи и действия из таблицы ниже, в разрезе по дням</p>
        </div>
        <div className="py-12 text-center text-sm text-slate-500">
          Нет данных за выбранный период. Новые данные появятся после активности в боте.
        </div>
      </div>
    );
  }

  return (
    <div className="card pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-slate-200 py-5 px-4 sm:px-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">Пользователей — Действия</h3>
          <p className="text-sm text-slate-500 mt-1">
            Те же пользователи и действия из таблицы ниже, в разрезе по дням за выбранный период
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          className="w-full sm:w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          aria-label="Выберите период"
        >
          <option value="7d">Последние 7 дней</option>
          <option value="30d">Последние 30 дней</option>
          <option value="90d">Последние 3 месяца</option>
        </select>
      </div>
      <div className="px-2 pt-4 pb-4 sm:px-6 sm:pt-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillActions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e40af" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1e40af" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fontSize: 10 }}
                tickFormatter={formatDateLabel}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || !label) return null;
                  const labels: Record<string, string> = { actions: 'Действия', users: 'Пользователей' };
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
                      <div className="text-xs font-medium text-slate-500 mb-1">
                        {formatDateTooltip(label)}
                      </div>
                      {payload.map((entry) => (
                        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: entry.color }}
                          />
                          <span className="text-slate-700">
                            {labels[String(entry.dataKey)] ?? entry.dataKey}:{' '}
                            <strong>{Number(entry.value)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={formatDateTooltip}
              />
              <Legend
                wrapperStyle={{ paddingTop: 12 }}
                formatter={(value) => (value === 'actions' ? 'Действия' : 'Пользователей')}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="users"
                yAxisId="right"
                fill="url(#fillUsers)"
                stroke="#1e40af"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="actions"
                name="actions"
                yAxisId="left"
                fill="url(#fillActions)"
                stroke="#0f172a"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
