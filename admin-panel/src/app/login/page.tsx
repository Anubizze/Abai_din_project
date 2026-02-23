'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is admin
      if (data.user) {
        const userEmail = data.user.email || '';
        console.log('Checking user:', userEmail);
        
        // First, try to find user by email (more reliable)
        let { data: userData, error: queryError } = await supabase
          .from('users')
          .select('id, role, email')
          .eq('email', userEmail)
          .single();

        console.log('User data from DB:', userData);
        console.log('Query error:', queryError);

        // If user doesn't exist in users table, create it
        if (!userData) {
          console.log('User not found, creating...');
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              email: userEmail,
              role: 'user', // Default role, will be updated if admin
              telegram_id: null,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating user:', insertError);
            setError(`Error: ${insertError.message}. Please check RLS policies.`);
            await supabase.auth.signOut();
            return;
          } else {
            userData = newUser;
            console.log('User created:', userData);
          }
        }

        // Check if user is admin
        console.log('Final userData:', userData);
        console.log('Role check:', userData?.role, '===', 'admin', '?', userData?.role === 'admin');
        
        if (!userData || userData.role !== 'admin') {
          await supabase.auth.signOut();
          setError(`Access denied. Your role is: ${userData?.role || 'not found'}. Admin role required.`);
          return;
        }
      }

      // Success! Session should be saved in cookies by createClientComponentClient
      console.log('✅ Login successful! Session saved in cookies.');
      
      // Wait a moment for cookies to be set, then redirect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Force a full page reload to ensure middleware reads the new cookies
      console.log('Redirecting to /admin...');
      window.location.href = '/admin';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Panel Login
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
