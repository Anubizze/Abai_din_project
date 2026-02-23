'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { logAdminAction } from '@/middleware/audit';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserProfileSummary {
  telegram_id: number;
  user_id: string;
  username: string | null;
  full_name: string | null;
  phone_number: string | null;
  preferred_lang: string | null;
  first_interaction: string | null;
  last_activity: string | null;
  active_days: number | null;
  total_actions: number | null;
  unique_action_types: number | null;
  unique_menus_accessed: number | null;
  unique_sessions: number | null;
  first_action_time: string | null;
  last_action_time: string | null;
  avg_response_time_ms: number | null;
  error_count: number | null;
}

interface UserRecord {
  id: string;
  telegram_id: number | null;
  email: string | null;
  tg_username: string | null;
  tg_first_name: string | null;
  tg_last_name: string | null;
  tg_language_code: string | null;
  tg_is_premium: boolean | null;
  tg_is_bot: boolean | null;
  tg_is_fake: boolean | null;
  tg_is_scam: boolean | null;
  tg_photo_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  preferred_lang: string | null;
  data_verification: Record<string, unknown> | null;
  data_source: Record<string, unknown> | null;
  created_at: string;
  last_seen_at: string | null;
}

interface UserAction {
  id: string;
  created_at: string;
  action_type: string;
  action_data: string | null;
  menu_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  response_time_ms: number | null;
  error_occurred: boolean | null;
  error_message: string | null;
  user_lang: string | null;
  ip_address: string | null;
  menu?: { callback_data: string | null };
}

interface DailyActivity {
  activity_date: string;
  actions_count: number;
}

interface HourlyActivity {
  activity_date: string;
  activity_hour: number;
  actions_count: number;
}

interface AnomalyRow {
  activity_date: string;
  actions_count: number;
  avg_actions: number;
  stddev_actions: number;
  z_score: number;
}

export default function UserProfilePage({ params }: { params: { telegram_id: string } }) {
  const telegramId = Number(params.telegram_id);
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [actions, setActions] = useState<UserAction[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    actionType: '',
    menuId: '',
    search: '',
  });
  const router = useRouter();
  const itemsPerPage = 50;

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, []);

  useEffect(() => {
    if (!user) return;
    logAdminAction({
      actionType: 'view_user_profile',
      entityType: 'user',
      entityId: String(telegramId),
      requestParams: { telegram_id: telegramId },
    });
  }, [user, telegramId]);

  useEffect(() => {
    loadActions();
  }, [page, filters]);

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

  const loadProfile = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const [profileRes, userRes, dailyRes, hourlyRes, anomalyRes] = await Promise.all([
        supabase
          .from('user_profiles_summary')
          .select('*')
          .eq('telegram_id', telegramId)
          .single(),
        supabase
          .from('users')
          .select('id, telegram_id, email, tg_username, tg_first_name, tg_last_name, tg_language_code, tg_is_premium, tg_is_bot, tg_is_fake, tg_is_scam, tg_photo_id, full_name, phone_number, preferred_lang, data_verification, data_source, created_at, last_seen_at')
          .eq('telegram_id', telegramId)
          .single(),
        supabase
          .from('user_activity_daily')
          .select('activity_date, actions_count')
          .eq('telegram_id', telegramId)
          .order('activity_date', { ascending: false }),
        supabase
          .from('user_activity_hourly')
          .select('activity_date, activity_hour, actions_count')
          .eq('telegram_id', telegramId)
          .order('activity_date', { ascending: false }),
        supabase
          .from('user_activity_anomalies')
          .select('activity_date, actions_count, avg_actions, stddev_actions, z_score')
          .eq('telegram_id', telegramId)
          .order('activity_date', { ascending: false }),
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      if (userRes.error && userRes.error.code !== 'PGRST116') throw userRes.error;

      setProfile(profileRes.data || null);
      setUserRecord(userRes.data || null);
      setDailyActivity((dailyRes.data || []) as DailyActivity[]);
      setHourlyActivity((hourlyRes.data || []) as HourlyActivity[]);
      setAnomalies((anomalyRes.data || []) as AnomalyRow[]);
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Ошибка при загрузке профиля пользователя');
    } finally {
      setLoading(false);
    }
  };

  const refreshAggregates = async () => {
    try {
      setRefreshing(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('refresh_analytics_views');
      if (error) {
        console.error('Error refreshing analytics views:', error);
        alert('Не удалось обновить агрегаты. Проверьте права и наличие функции refresh_analytics_views.');
        return;
      }
      await loadProfile();
      await loadActions();
    } catch (error) {
      console.error('Error refreshing aggregates:', error);
      alert('Ошибка при обновлении агрегатов.');
    } finally {
      setRefreshing(false);
    }
  };

  const loadActions = async () => {
    try {
      setActionsLoading(true);
      const supabase = getSupabaseClient();

      let query = supabase
        .from('user_actions')
        .select(`
          id,
          created_at,
          action_type,
          action_data,
          menu_id,
          session_id,
          metadata,
          response_time_ms,
          error_occurred,
          error_message,
          user_lang,
          ip_address,
          menu:bot_menus(callback_data)
        `, { count: 'exact' })
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters.menuId) {
        query = query.eq('menu_id', filters.menuId);
      }
      if (filters.search) {
        query = query.ilike('action_data', `%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Transform data: Supabase returns menu as array, but we need it as object
      const transformedData = (data || []).map((action: any) => ({
        ...action,
        menu: Array.isArray(action.menu) && action.menu.length > 0 
          ? { callback_data: action.menu[0].callback_data } 
          : action.menu 
          ? { callback_data: action.menu.callback_data }
          : undefined
      }));

      setActions(transformedData as UserAction[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading actions:', error);
      alert('Ошибка при загрузке истории действий');
    } finally {
      setActionsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const verificationMap = useMemo(() => userRecord?.data_verification || {}, [userRecord]);
  const sourceMap = useMemo(() => userRecord?.data_source || {}, [userRecord]);

  const isVerified = (key: string) => {
    const value = (verificationMap as Record<string, unknown>)[key];
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object' && 'verified' in (value as any)) {
      return Boolean((value as any).verified);
    }
    return false;
  };

  const getSource = (key: string) => {
    const value = (sourceMap as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'source' in (value as any)) {
      return String((value as any).source);
    }
    return 'system';
  };

  const renderVerification = (key: string) => (
    <div className="flex items-center gap-2">
      <span className={`badge ${isVerified(key) ? 'badge-success' : 'badge-neutral'}`}>
        {isVerified(key) ? 'verified' : 'unverified'}
      </span>
      <span className="text-xs text-slate-500">source: {getSource(key)}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="text-center text-sm text-slate-500">Загрузка профиля...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
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
                <Link href="/admin/analytics/users" className="text-sm text-slate-500 hover:text-slate-900">Пользователи</Link>
                <span className="text-sm text-slate-700 font-medium">Профиль</span>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
              <button
                onClick={async () => {
                  const supabase = getSupabaseClient();
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="btn btn-secondary btn-sm"
                title="Выйти из аккаунта"
              >
                🚪 Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Профиль пользователя: {telegramId}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Данные формируются на уровне БД (материализованные представления и агрегаты SQL)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/analytics/users" className="btn btn-secondary btn-sm">
                ← Назад к пользователям
              </Link>
              <button
                className="btn btn-secondary btn-sm"
                onClick={refreshAggregates}
                disabled={refreshing}
              >
                {refreshing ? 'Обновление...' : 'Обновить агрегаты'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(`/api/analytics/export?format=csv&type=profile&telegram_id=${telegramId}`, '_blank')}
              >
                CSV
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(`/api/analytics/export?format=json&type=profile&telegram_id=${telegramId}`, '_blank')}
              >
                JSON
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(`/api/analytics/export?format=pdf&type=profile&telegram_id=${telegramId}`, '_blank')}
              >
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Идентификация</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-slate-600">Telegram ID</div>
                <div className="font-mono text-slate-900">{telegramId}</div>
                {renderVerification('telegram_id')}
              </div>
              <div>
                <div className="text-slate-600">Username</div>
                <div className="font-mono text-slate-900">{userRecord?.tg_username ? `@${userRecord.tg_username}` : '—'}</div>
                {renderVerification('tg_username')}
              </div>
              <div>
                <div className="text-slate-600">Имя / Фамилия</div>
                <div className="text-slate-900">
                  {userRecord?.tg_first_name || userRecord?.tg_last_name
                    ? `${userRecord?.tg_first_name || ''} ${userRecord?.tg_last_name || ''}`.trim()
                    : (userRecord?.full_name || '—')}
                </div>
                {renderVerification('tg_first_name')}
              </div>
              <div>
                <div className="text-slate-600">Телефон</div>
                <div className="font-mono text-slate-900">{userRecord?.phone_number || '—'}</div>
                {renderVerification('phone_number')}
              </div>
              <div>
                <div className="text-slate-600">Язык</div>
                <div className="text-slate-900">{userRecord?.tg_language_code || userRecord?.preferred_lang || profile?.preferred_lang || '—'}</div>
                {renderVerification('tg_language_code')}
              </div>
              <div>
                <div className="text-slate-600">Премиум</div>
                <div className="text-slate-900">{userRecord?.tg_is_premium ? 'Да' : 'Нет'}</div>
                {renderVerification('tg_is_premium')}
              </div>
              <div>
                <div className="text-slate-600">Флаги</div>
                <div className="text-slate-900">
                  {userRecord?.tg_is_bot && 'bot '}
                  {userRecord?.tg_is_fake && 'fake '}
                  {userRecord?.tg_is_scam && 'scam '}
                  {!userRecord?.tg_is_bot && !userRecord?.tg_is_fake && !userRecord?.tg_is_scam && '—'}
                </div>
                {renderVerification('tg_is_bot')}
              </div>
              <div>
                <div className="text-slate-600">Photo ID</div>
                <div className="font-mono text-slate-900">{userRecord?.tg_photo_id || '—'}</div>
                {renderVerification('tg_photo_id')}
              </div>
            </div>
          </div>
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Сводка профиля</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-600">Первое взаимодействие</div>
                <div className="text-slate-900">{formatDate(profile?.first_action_time || userRecord?.created_at || null)}</div>
              </div>
              <div>
                <div className="text-slate-600">Последняя активность</div>
                <div className="text-slate-900">{formatDate(profile?.last_action_time || userRecord?.last_seen_at || null)}</div>
              </div>
              <div>
                <div className="text-slate-600">Всего действий</div>
                <div className="text-slate-900">{profile?.total_actions ?? 0}</div>
              </div>
              <div>
                <div className="text-slate-600">Уникальных сессий</div>
                <div className="text-slate-900">{profile?.unique_sessions ?? 0}</div>
              </div>
              <div>
                <div className="text-slate-600">Среднее время ответа</div>
                <div className="text-slate-900">{profile?.avg_response_time_ms ? `${Math.round(profile.avg_response_time_ms)} ms` : '—'}</div>
              </div>
              <div>
                <div className="text-slate-600">Ошибки</div>
                <div className="text-slate-900">{profile?.error_count ?? 0}</div>
              </div>
            </div>
          </div>
        </div>

        {(profile?.total_actions === 0 && actions.length > 0) && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
            Агрегаты для профиля не обновлены. Нажмите «Обновить агрегаты», чтобы синхронизировать сводку.
          </div>
        )}

        {/* Behavioral analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Активность по дням</h3>
            <div className="space-y-2 max-h-56 overflow-auto">
              {dailyActivity.length === 0 ? (
                <div className="text-xs text-slate-500">Нет данных</div>
              ) : (
                dailyActivity.map((row) => (
                  <div key={row.activity_date} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{row.activity_date}</span>
                    <span className="font-mono text-slate-900">{row.actions_count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Активность по часам</h3>
            <div className="space-y-2 max-h-56 overflow-auto">
              {hourlyActivity.length === 0 ? (
                <div className="text-xs text-slate-500">Нет данных</div>
              ) : (
                hourlyActivity.map((row, idx) => (
                  <div key={`${row.activity_date}-${row.activity_hour}-${idx}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{row.activity_date} {String(row.activity_hour).padStart(2, '0')}:00</span>
                    <span className="font-mono text-slate-900">{row.actions_count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Аномалии</h3>
            <div className="space-y-2 max-h-56 overflow-auto">
              {anomalies.length === 0 ? (
                <div className="text-xs text-slate-500">Аномалии не обнаружены</div>
              ) : (
                anomalies.map((row, idx) => (
                  <div key={`${row.activity_date}-${idx}`} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">{row.activity_date}</span>
                      <span className="font-mono text-slate-900">{row.actions_count}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      z-score: {row.z_score?.toFixed(2)} | avg: {Math.round(row.avg_actions)} | σ: {row.stddev_actions?.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Поведенческая история</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Дата от</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Дата до</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Тип действия</label>
              <select
                value={filters.actionType}
                onChange={(e) => setFilters((prev) => ({ ...prev, actionType: e.target.value }))}
                className="input text-sm w-full"
              >
                <option value="">Все</option>
                <option value="button_click">button_click</option>
                <option value="command">command</option>
                <option value="message">message</option>
                <option value="set_lang">set_lang</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Menu ID</label>
              <input
                type="text"
                value={filters.menuId}
                onChange={(e) => setFilters((prev) => ({ ...prev, menuId: e.target.value }))}
                className="input text-sm w-full font-mono"
                placeholder="UUID меню"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Поиск (action_data)</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="input text-sm w-full"
                placeholder="Поиск"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Время</th>
                  <th>Тип</th>
                  <th>Меню</th>
                  <th>Сессия</th>
                  <th>Данные</th>
                  <th>Язык</th>
                  <th>Ошибки</th>
                </tr>
              </thead>
              <tbody>
                {actionsLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm text-slate-500">
                      Загрузка...
                    </td>
                  </tr>
                ) : actions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm text-slate-500">
                      Действия не найдены
                    </td>
                  </tr>
                ) : (
                  actions.map((action, index) => (
                    <tr key={action.id}>
                      <td className="text-slate-500 font-mono text-xs">
                        #{(page - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="text-xs text-slate-600">{formatDate(action.created_at)}</td>
                      <td>
                        <span className="badge badge-neutral text-xs">{action.action_type}</span>
                      </td>
                      <td className="text-xs">
                        {action.menu?.callback_data ? (
                          <span className="font-mono text-slate-700">{action.menu.callback_data}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-xs font-mono text-slate-600">
                        {action.session_id || '—'}
                      </td>
                      <td className="text-xs text-slate-600">
                        {action.action_data || '—'}
                      </td>
                      <td className="text-xs text-slate-600">{action.user_lang || '—'}</td>
                      <td className="text-xs text-slate-600">
                        {action.error_occurred ? (
                          <span className="text-red-600">error</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-ghost btn-sm disabled:opacity-30"
              >
                ← Назад
              </button>
              <span className="text-xs text-slate-500">
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-ghost btn-sm disabled:opacity-30"
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
