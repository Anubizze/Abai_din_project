'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { logAdminAction } from '@/middleware/audit';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserAction {
  id: string;
  user_id: string | null;
  telegram_id: number | null;
  action_type: string;
  action_data: string | null;
  menu_id: string | null;
  created_at: string;
  menu?: {
    callback_data: string | null;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<UserAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    actionType: '',
    menuId: '',
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadEvents();
  }, [page, filters]);

  useEffect(() => {
    if (!user) return;
    logAdminAction({
      actionType: 'view_events',
      entityType: 'analytics',
      entityId: 'events',
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

  const loadEvents = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('user_actions')
        .select(`
          *,
          menu:bot_menus(callback_data)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      // Применяем фильтры
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }
      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters.menuId) {
        query = query.eq('menu_id', filters.menuId);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error loading events:', error);
        
        // Более информативное сообщение об ошибке
        let errorMessage = 'Ошибка при загрузке событий';
        if (error.code === '42501') {
          errorMessage = 'Нет доступа к данным. Проверьте права администратора.';
        } else if (error.message) {
          errorMessage = `Ошибка: ${error.message}`;
        }
        
        alert(errorMessage);
        setEvents([]);
        setTotalCount(0);
        return;
      }
      
      setEvents(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert(`Ошибка при загрузке событий: ${errorMessage}`);
      setEvents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1); // Сбрасываем на первую страницу при изменении фильтров
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
                <Link href="/admin/analytics/events" className="text-sm text-slate-700 font-medium">События</Link>
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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">События</h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Всего событий: {totalCount}
              </p>
            </div>
            <Link href="/admin/analytics" className="btn btn-secondary btn-sm">
              ← Назад к аналитике
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Дата от</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Дата до</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Тип действия</label>
              <select
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">Все</option>
                <option value="button_click">Нажатие кнопки</option>
                <option value="command">Команда</option>
                <option value="message">Сообщение</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Меню</label>
              <input
                type="text"
                value={filters.menuId}
                onChange={(e) => handleFilterChange('menuId', e.target.value)}
                className="input text-sm w-full font-mono"
                placeholder="ID меню"
              />
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Время</th>
                  <th className="hidden sm:table-cell">Тип</th>
                  <th className="hidden md:table-cell">Telegram ID</th>
                  <th className="hidden lg:table-cell">Меню</th>
                  <th className="hidden xl:table-cell">Данные</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-slate-500">
                      Загрузка...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-slate-500">
                      События не найдены
                    </td>
                  </tr>
                ) : (
                  events.map((event, index) => (
                    <tr key={event.id || `event-${index}`}>
                      <td className="text-slate-500 font-mono text-xs">
                        #{(page - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="text-xs text-slate-600">
                        {event.created_at ? formatDate(event.created_at) : '—'}
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className="badge badge-neutral text-xs">
                          {event.action_type || '—'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        {event.telegram_id ? (
                          <span className="text-xs font-mono text-slate-600">{String(event.telegram_id)}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell">
                        {event.menu?.callback_data ? (
                          <span className="text-xs font-mono text-slate-600">{event.menu.callback_data}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell">
                        {event.action_data ? (
                          <span className="text-xs text-slate-500 truncate max-w-xs block">
                            {String(event.action_data)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Страница {page} из {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
                >
                  Вперед →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
