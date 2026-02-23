'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import MenusList from '@/components/MenusList';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

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
    <div 
      className="min-h-screen" 
      style={{ 
        background: '#f8fafc',
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Header */}
      <header className="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4 sm:gap-8">
              <h1 className="text-base font-semibold text-slate-900">Abai Bot Admin</h1>
              <nav className="hidden md:flex items-center gap-6">
                <a href="/admin" className="text-sm text-slate-700 font-medium hover:text-slate-900">Меню</a>
                <a href="/admin/analytics" className="text-sm text-slate-500 hover:text-slate-900">Аналитика</a>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
              <a
                href="/admin/analytics"
                className="btn btn-secondary btn-sm md:hidden"
                title="Перейти к аналитике"
              >
                📊 Аналитика
              </a>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Выйти из аккаунта"
              >
                <span className="md:hidden">🚪 Выйти</span>
                <span className="hidden md:inline">🚪 Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
        style={{ 
          minHeight: 'calc(100vh - 56px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Mobile Navigation */}
        <div className="md:hidden mb-4">
          <div className="card p-3">
            <div className="flex items-center gap-2">
              <a
                href="/admin"
                className="flex-1 btn btn-secondary btn-sm text-center"
              >
                📋 Меню
              </a>
              <a
                href="/admin/analytics"
                className="flex-1 btn btn-primary btn-sm text-center"
              >
                📊 Аналитика
              </a>
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'visible', overflowY: 'visible' }}>
          <MenusList />
        </div>
      </main>
    </div>
  );
}
