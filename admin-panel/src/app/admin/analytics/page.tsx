'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { logAdminAction } from '@/middleware/audit';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    logAdminAction({
      actionType: 'view_analytics_home',
      entityType: 'analytics',
      entityId: 'home',
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
    } finally {
      setLoading(false);
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
                <Link href="/admin/analytics" className="text-sm text-slate-700 font-medium">Аналитика</Link>
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
        {/* Mobile Navigation */}
        <div className="md:hidden mb-4">
          <div className="card p-3">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="flex-1 btn btn-secondary btn-sm text-center"
              >
                📋 Меню
              </Link>
              <Link
                href="/admin/analytics"
                className="flex-1 btn btn-primary btn-sm text-center"
              >
                📊 Аналитика
              </Link>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Аналитика</h1>
          <p className="text-xs sm:text-sm text-slate-600">Статистика и аналитика использования бота</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Link href="/admin/analytics/users" className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Пользователи</h3>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Список всех пользователей бота с информацией об активности
            </p>
            <div className="text-xs text-slate-500">Перейти →</div>
          </Link>

          <Link href="/admin/analytics/events" className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">События</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              История всех действий пользователей с фильтрами
            </p>
            <div className="text-xs text-slate-500">Перейти →</div>
          </Link>

          <Link href="/admin/analytics/summary" className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Сводка</h3>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Статистика: DAU/WAU, топ кнопок, топ языков
            </p>
            <div className="text-xs text-slate-500">Перейти →</div>
          </Link>
        </div>
      </main>
    </div>
  );
}
