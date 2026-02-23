'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { logAdminAction } from '@/middleware/audit';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ActivityChart } from '@/components/analytics/ActivityChart';
import { ChartAreaInteractive } from '@/components/analytics/ChartAreaInteractive';
import { HeatmapChart } from '@/components/analytics/HeatmapChart';
import { GrowthChart } from '@/components/analytics/GrowthChart';

interface SummaryStats {
  dau: number;
  wau: number;
  mau: number;
  totalUsers: number;
  totalActions: number;
  totalSessions: number;
  totalErrors: number;
  retention1d: number | null;
  retention7d: number | null;
  retention30d: number | null;
  topButtons: Array<{ callback_data: string; count: number }>;
  topLanguages: Array<{ lang: string; count: number }>;
}

export default function SummaryPage() {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dailyActivity, setDailyActivity] = useState<Array<{ activity_date: string; total_actions: number }>>([]);
  const [hourlyActivity, setHourlyActivity] = useState<Array<{ activity_hour: number; actions_count: number }>>([]);
  const [growthData, setGrowthData] = useState<Array<{ activity_date: string; total_users: number }>>([]);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  useEffect(() => {
    if (!user) return;
    logAdminAction({
      actionType: 'view_summary',
      entityType: 'analytics',
      entityId: 'summary',
    });
  }, [user]);

  const checkAuth = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email || '')
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        router.push('/unauthorized');
        return;
      }

      setUser(userData);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      const [
        metricsRes,
        totalsRes,
        topButtonsRes,
        topLanguagesRes,
        retentionRes,
        dailyRes,
        hourlyRes,
        growthRes,
      ] = await Promise.all([
        supabase
          .from('analytics_metrics')
          .select('date, dau, wau, mau')
          .order('date', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('analytics_totals')
          .select('total_users, total_actions, total_sessions, total_errors')
          .single(),
        supabase
          .from('top_buttons_summary')
          .select('callback_data, count')
          .order('count', { ascending: false })
          .limit(10),
        supabase
          .from('top_languages_summary')
          .select('lang, count')
          .order('count', { ascending: false }),
        supabase
          .from('retention_summary')
          .select('day_number, retention_rate')
          .order('day_number', { ascending: true }),
        supabase
          .from('user_daily_activity')
          .select('activity_date, total_actions')
          .order('activity_date', { ascending: true }),
        supabase
          .from('hourly_activity_summary')
          .select('activity_hour, actions_count')
          .order('activity_hour', { ascending: true }),
        supabase
          .from('user_growth_daily')
          .select('activity_date, total_users')
          .order('activity_date', { ascending: true }),
      ]);

      if (metricsRes.error) {
        console.error('Error loading analytics_metrics:', metricsRes.error);
      }
      if (totalsRes.error) {
        console.error('Error loading analytics_totals:', totalsRes.error);
      }
      if (topButtonsRes.error) {
        console.error('Error loading top_buttons_summary:', topButtonsRes.error);
      }
      if (topLanguagesRes.error) {
        console.error('Error loading top_languages_summary:', topLanguagesRes.error);
      }
      if (retentionRes.error) {
        console.error('Error loading retention_summary:', retentionRes.error);
      }
      if (dailyRes.error) {
        console.error('Error loading user_daily_activity:', dailyRes.error);
      }
      if (hourlyRes.error) {
        console.error('Error loading hourly_activity_summary:', hourlyRes.error);
      }
      if (growthRes.error) {
        console.error('Error loading user_growth_daily:', growthRes.error);
      }

      const retentionMap = new Map<number, number>();
      (retentionRes.data || []).forEach((row: any) => {
        retentionMap.set(Number(row.day_number), Number(row.retention_rate));
      });

      setStats({
        dau: metricsRes.data?.dau || 0,
        wau: metricsRes.data?.wau || 0,
        mau: metricsRes.data?.mau || 0,
        totalUsers: totalsRes.data?.total_users || 0,
        totalActions: totalsRes.data?.total_actions || 0,
        totalSessions: totalsRes.data?.total_sessions || 0,
        totalErrors: totalsRes.data?.total_errors || 0,
        retention1d: retentionMap.get(1) ?? null,
        retention7d: retentionMap.get(7) ?? null,
        retention30d: retentionMap.get(30) ?? null,
        topButtons: (topButtonsRes.data || []) as Array<{ callback_data: string; count: number }>,
        topLanguages: (topLanguagesRes.data || []) as Array<{ lang: string; count: number }>,
      });

      setDailyActivity((dailyRes.data || []) as Array<{ activity_date: string; total_actions: number }>);
      setHourlyActivity((hourlyRes.data || []) as Array<{ activity_hour: number; actions_count: number }>);
      setGrowthData((growthRes.data || []) as Array<{ activity_date: string; total_users: number }>);
    } catch (error) {
      console.error('Error loading stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert(`Ошибка при загрузке статистики: ${errorMessage}`);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <header className="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/admin" className="text-base font-semibold text-slate-900 hover:text-slate-700">
                Abai Bot Admin
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">Меню</Link>
                <Link href="/admin/analytics" className="text-sm text-slate-500 hover:text-slate-900">Аналитика</Link>
                <Link href="/admin/analytics/summary" className="text-sm text-slate-700 font-medium">Сводка</Link>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Выйти из аккаунта"
              >
                🚪 Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Сводка</h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Статистика использования бота
              </p>
            </div>
            <Link href="/admin/analytics" className="btn btn-secondary btn-sm">
              ← Назад к аналитике
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-sm text-slate-600">Загрузка статистики...</div>
          </div>
        ) : stats ? (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">DAU</div>
                <div className="text-3xl font-bold text-slate-900">{stats.dau}</div>
                <div className="text-xs text-slate-500 mt-1">Активных за 24 часа</div>
              </div>
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">WAU</div>
                <div className="text-3xl font-bold text-slate-900">{stats.wau}</div>
                <div className="text-xs text-slate-500 mt-1">Активных за 7 дней</div>
              </div>
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">MAU</div>
                <div className="text-3xl font-bold text-slate-900">{stats.mau}</div>
                <div className="text-xs text-slate-500 mt-1">Активных за 30 дней</div>
              </div>
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">Всего пользователей</div>
                <div className="text-3xl font-bold text-slate-900">{stats.totalUsers}</div>
                <div className="text-xs text-slate-500 mt-1">Telegram пользователей</div>
              </div>
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">Всего действий</div>
                <div className="text-3xl font-bold text-slate-900">{stats.totalActions}</div>
                <div className="text-xs text-slate-500 mt-1">Все события</div>
              </div>
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">Уникальные сессии</div>
                <div className="text-3xl font-bold text-slate-900">{stats.totalSessions}</div>
                <div className="text-xs text-slate-500 mt-1">Всего сессий</div>
              </div>
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">Ошибки</div>
                <div className="text-3xl font-bold text-slate-900">{stats.totalErrors}</div>
                <div className="text-xs text-slate-500 mt-1">Всего ошибок</div>
              </div>
              <div className="card p-4 sm:p-6">
                <div className="text-sm text-slate-600 mb-2">Retention</div>
                <div className="text-sm text-slate-900">1d: {stats.retention1d ?? '—'}%</div>
                <div className="text-sm text-slate-900">7d: {stats.retention7d ?? '—'}%</div>
                <div className="text-sm text-slate-900">30d: {stats.retention30d ?? '—'}%</div>
              </div>
            </div>

            {/* Interactive area chart — активность и рост по дням */}
            <div className="mb-6">
              <ChartAreaInteractive
                dailyActivity={dailyActivity}
                growthData={growthData}
              />
            </div>

            {/* Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <ActivityChart
                data={dailyActivity.map((row) => ({
                  activity_date: row.activity_date,
                  actions_count: row.total_actions,
                }))}
              />
              <HeatmapChart data={hourlyActivity} />
              <GrowthChart data={growthData} />
            </div>

            {/* Top Buttons and Languages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Top Buttons */}
              <div className="card p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Топ кнопок</h3>
                {stats.topButtons.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topButtons.map((button, index) => (
                      <div key={button.callback_data} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-500 w-6">#{index + 1}</span>
                          <span className="text-sm font-mono text-slate-900">{button.callback_data}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{button.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Нет данных</p>
                )}
              </div>

              {/* Top Languages */}
              <div className="card p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Топ языков</h3>
                {stats.topLanguages.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topLanguages.map((lang, index) => (
                      <div key={lang.lang} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-500 w-6">#{index + 1}</span>
                          <span className="text-sm font-semibold text-slate-900 uppercase">{lang.lang}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{lang.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Нет данных</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-sm text-slate-600">Не удалось загрузить статистику</div>
          </div>
        )}
      </main>
    </div>
  );
}
