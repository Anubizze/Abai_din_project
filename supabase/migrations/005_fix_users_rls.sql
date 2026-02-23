-- ============================================
-- FIX USERS RLS POLICIES
-- Fix infinite recursion by using security definer function
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users read own data" ON users;
DROP POLICY IF EXISTS "Admins read all users" ON users;
DROP POLICY IF EXISTS "Admins update all users" ON users;
DROP POLICY IF EXISTS "Users update own data" ON users;
DROP POLICY IF EXISTS "Admins insert users" ON users;

-- Create helper function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_role TEXT;
BEGIN
    -- Get email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid()
    LIMIT 1;
    
    IF user_email IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check role in users table (using service role context to avoid recursion)
    -- This function runs with SECURITY DEFINER, so it bypasses RLS
    SELECT role INTO user_role
    FROM public.users
    WHERE email = user_email
    LIMIT 1;
    
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users can read their own data (by email)
CREATE POLICY "Users read own data" ON users
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    );

-- Users can update their own data (by email)
CREATE POLICY "Users update own data" ON users
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    );

-- Admins can read all users (using helper function to avoid recursion)
CREATE POLICY "Admins read all users" ON users
    FOR SELECT USING (public.is_admin_user());

-- Admins can update all users (using helper function)
CREATE POLICY "Admins update all users" ON users
    FOR UPDATE USING (public.is_admin_user());

-- Admins can insert users (using helper function)
CREATE POLICY "Admins insert users" ON users
    FOR INSERT WITH CHECK (public.is_admin_user());

-- Allow authenticated users to insert themselves (for first-time login)
CREATE POLICY "Users insert self" ON users
    FOR INSERT WITH CHECK (
        email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    );
