/**
 * Next.js middleware for auth protection
 */

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Check if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    // Allow request to continue, but it will fail at page level
    return res;
  }
  
  // Create middleware client - this handles cookie sync automatically
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session to ensure cookies are up to date
  await supabase.auth.getSession();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    console.log('🔒 Middleware: Checking /admin access');
    console.log('Session exists:', !!session);
    console.log('User email:', session?.user?.email);
    
    if (!session) {
      console.log('❌ Middleware: No session, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user is admin (by email, more reliable)
    // Use function to avoid RLS issues
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role, email')
        .eq('email', session.user.email || '')
        .single();

      console.log('Middleware: User data:', user);
      console.log('Middleware: User error:', userError);

      if (userError || !user || user.role !== 'admin') {
        console.log('❌ Middleware: User not admin, redirecting to unauthorized');
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
      
      console.log('✅ Middleware: Admin access granted');
    } catch (error) {
      console.error('❌ Middleware error:', error);
      // Allow through, let page handle it
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
