'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { logAdminAction } from '@/middleware/audit';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChartAreaInteractive } from '@/components/analytics/ChartAreaInteractive';

interface User {
  id: string;
  telegram_id: number | null;
  email: string | null;
  username: string | null;
  tg_username: string | null;
  tg_first_name: string | null;
  tg_last_name: string | null;
  tg_language_code: string | null;
  tg_is_premium: boolean | null;
  tg_is_bot: boolean | null;
  tg_is_fake: boolean | null;
  tg_is_scam: boolean | null;
  phone_number: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  last_seen_at: string | null;
  actions_count?: number;
}

type DailyActivityPoint = { activity_date: string; total_actions: number };
type GrowthPoint = { activity_date: string; total_users: number };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivityPoint[]>([]);
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadUsers();
    loadChartData();
  }, []);

  useEffect(() => {
    if (!user) return;
    logAdminAction({
      actionType: 'view_users_list',
      entityType: 'analytics',
      entityId: 'users',
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

  const loadUsers = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Загружаем пользователей с подсчетом действий
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        let errorMessage = 'Ошибка при загрузке пользователей';
        if (usersError.code === '42501') {
          errorMessage = 'Нет доступа к данным. Проверьте права администратора.';
        } else if (usersError.message) {
          errorMessage = `Ошибка: ${usersError.message}`;
        }
        alert(errorMessage);
        setUsers([]);
        setLoading(false);
        return;
      }

      // Подсчитываем количество действий для каждого пользователя
      const usersWithActions = await Promise.all(
        (usersData || []).map(async (u) => {
          try {
            let count = 0;
            
            // Строим запрос с учетом того, что user_id или telegram_id могут быть null
            const conditions: string[] = [];
            if (u.id) {
              conditions.push(`user_id.eq.${u.id}`);
            }
            if (u.telegram_id) {
              conditions.push(`telegram_id.eq.${u.telegram_id}`);
            }
            
            if (conditions.length > 0) {
              const { count: actionCount, error: actionError } = await supabase
                .from('user_actions')
                .select('*', { count: 'exact', head: true })
                .or(conditions.join(','));

              if (actionError) {
                console.error(`Error counting actions for user ${u.id}:`, actionError);
              } else {
                count = actionCount || 0;
              }
            }

            return {
              ...u,
              actions_count: count,
            };
          } catch (error) {
            console.error(`Error counting actions for user ${u.id}:`, error);
            return {
              ...u,
              actions_count: 0,
            };
          }
        })
      );

      setUsers(usersWithActions);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
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
    });
  };

  const loadChartData = async () => {
    try {
      const supabase = getSupabaseClient();
      const [dailyRes, growthRes] = await Promise.all([
        supabase
          .from('user_daily_activity')
          .select('activity_date, total_actions')
          .order('activity_date', { ascending: true }),
        supabase
          .from('user_growth_daily')
          .select('activity_date, total_users')
          .order('activity_date', { ascending: true }),
      ]);
      setDailyActivity((dailyRes.data || []) as DailyActivityPoint[]);
      setGrowthData((growthRes.data || []) as GrowthPoint[]);
    } catch {
      setDailyActivity([]);
      setGrowthData([]);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-600">Загрузка...</div>
      </div>
    );
  }

  const telegramUsers = users.filter(u => u.telegram_id);
  const adminUsers = users.filter(u => u.email && u.role === 'admin');

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
                <Link href="/admin/analytics/users" className="text-sm text-slate-700 font-medium">Пользователи</Link>
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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Пользователи</h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Всего: {users.length} ({telegramUsers.length} Telegram, {adminUsers.length} админов)
              </p>
            </div>
            <Link href="/admin/analytics" className="btn btn-secondary btn-sm">
              ← Назад к аналитике
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm text-slate-600 mb-1">Всего пользователей</div>
            <div className="text-2xl font-bold text-slate-900">{users.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-600 mb-1">Telegram пользователей</div>
            <div className="text-2xl font-bold text-slate-900">{telegramUsers.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-600 mb-1">Администраторов</div>
            <div className="text-2xl font-bold text-slate-900">{adminUsers.length}</div>
          </div>
        </div>

        {/* Аналитика: активность и рост по дням (area chart) */}
        <div className="mb-6">
          <ChartAreaInteractive dailyActivity={dailyActivity} growthData={growthData} />
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">ID</th>
                  <th>Имя / Email</th>
                  <th className="hidden sm:table-cell">Telegram ID</th>
                  <th className="hidden md:table-cell">Username</th>
                  <th className="hidden lg:table-cell">Профиль Telegram</th>
                  <th className="hidden lg:table-cell">Телефон</th>
                  <th className="hidden lg:table-cell">Язык</th>
                  <th className="hidden xl:table-cell">Premium</th>
                  <th className="hidden xl:table-cell">Флаги</th>
                  <th className="w-24">Роль</th>
                  <th className="hidden md:table-cell">Действий</th>
                  <th className="hidden lg:table-cell">Создан</th>
                  <th className="hidden lg:table-cell">Последняя активность</th>
                  <th className="w-24">Профиль</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, index) => {
                  const userId = u.id ? String(u.id) : '';
                  const userIdDisplay = userId ? userId.substring(0, 8) : `user-${index}`;
                  
                  return (
                    <tr key={u.id || `user-${index}`}>
                      <td className="text-slate-500 font-mono text-xs">#{index + 1}</td>
                      <td>
                        <div className="font-medium text-slate-900">
                          {u.full_name || `${u.tg_first_name || ''} ${u.tg_last_name || ''}`.trim() || u.email || `User ${userIdDisplay}`}
                        </div>
                        {u.email && (
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell">
                        {u.telegram_id ? (
                          <span className="text-xs font-mono text-slate-600">{String(u.telegram_id)}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell">
                        {u.tg_username ? (
                          <span className="text-xs font-mono text-slate-600">@{u.tg_username}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell">
                        {u.tg_username ? (
                          <a
                            href={`https://t.me/${u.tg_username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-slate-700 hover:text-slate-900"
                          >
                            t.me/{u.tg_username}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell">
                        {u.phone_number ? (
                          <span className="text-xs font-mono text-slate-600">{u.phone_number}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell">
                        {u.tg_language_code ? (
                          <span className="text-xs text-slate-600">{u.tg_language_code}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell">
                        {u.tg_is_premium ? (
                          <span className="badge badge-success">premium</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell">
                        <div className="flex items-center gap-1">
                          {u.tg_is_bot && <span className="badge badge-neutral">bot</span>}
                          {u.tg_is_fake && <span className="badge badge-warning">fake</span>}
                          {u.tg_is_scam && <span className="badge badge-error">scam</span>}
                          {!u.tg_is_bot && !u.tg_is_fake && !u.tg_is_scam && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          u.role === 'admin' ? 'badge-error' : 
                          u.role === 'manager' ? 'badge-neutral' : 
                          'badge-success'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-sm text-slate-600">{u.actions_count || 0}</span>
                      </td>
                      <td className="hidden lg:table-cell text-xs text-slate-500">
                        {u.created_at ? formatDate(u.created_at) : '—'}
                      </td>
                      <td className="hidden lg:table-cell text-xs text-slate-500">
                        {u.last_seen_at ? formatDate(u.last_seen_at) : '—'}
                      </td>
                      <td>
                        {u.telegram_id ? (
                          <Link href={`/admin/analytics/users/${u.telegram_id}`} className="btn btn-secondary btn-sm">
                            Открыть
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500">Пользователи не найдены</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
