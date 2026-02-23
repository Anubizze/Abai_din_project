-- ============================================
-- FIX USERS RLS POLICIES (простое решение)
-- Убрать рекурсию и сделать политики работающими
-- ============================================

-- Удалить ВСЕ старые политики
DROP POLICY IF EXISTS "Service role full access users" ON users;
DROP POLICY IF EXISTS "Users read own data" ON users;
DROP POLICY IF EXISTS "Admins read all users" ON users;
DROP POLICY IF EXISTS "Admins update all users" ON users;
DROP POLICY IF EXISTS "Users update own data" ON users;
DROP POLICY IF EXISTS "Admins insert users" ON users;
DROP POLICY IF EXISTS "Users insert self" ON users;

-- Удалить функцию если есть
DROP FUNCTION IF EXISTS public.is_admin_user();

-- ============================================
-- НОВЫЕ ПОЛИТИКИ (без рекурсии)
-- ============================================

-- Service role: полный доступ (для бота)
CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Пользователи могут читать свои данные (по email, без рекурсии)
-- Используем более надежную проверку
CREATE POLICY "Users read own data" ON users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = users.email
        )
    );

-- Пользователи могут обновлять свои данные
CREATE POLICY "Users update own data" ON users
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    );

-- Пользователи могут создавать свою запись (для первого входа)
CREATE POLICY "Users insert self" ON users
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = users.email
        )
    );

-- ============================================
-- ФУНКЦИЯ ДЛЯ ПРОВЕРКИ АДМИНА (обходит RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_role TEXT;
BEGIN
    -- Получить email из auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid()
    LIMIT 1;
    
    IF user_email IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Проверить роль в users (SECURITY DEFINER обходит RLS)
    SELECT role INTO user_role
    FROM public.users
    WHERE email = user_email
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'user') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Админы могут читать всех пользователей (использует функцию)
CREATE POLICY "Admins read all users" ON users
    FOR SELECT USING (public.is_admin_user());

-- Админы могут обновлять всех пользователей
CREATE POLICY "Admins update all users" ON users
    FOR UPDATE USING (public.is_admin_user());

-- Админы могут создавать пользователей
CREATE POLICY "Admins insert users" ON users
    FOR INSERT WITH CHECK (public.is_admin_user());
