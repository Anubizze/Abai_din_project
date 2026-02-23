-- ============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ RLS ДЛЯ USERS
-- Исправление ошибок в политиках
-- ============================================

-- Удалить все политики
DROP POLICY IF EXISTS "Service role full access users" ON users;
DROP POLICY IF EXISTS "Users read own data" ON users;
DROP POLICY IF EXISTS "Admins read all users" ON users;
DROP POLICY IF EXISTS "Admins update all users" ON users;
DROP POLICY IF EXISTS "Users update own data" ON users;
DROP POLICY IF EXISTS "Admins insert users" ON users;
DROP POLICY IF EXISTS "Users insert self" ON users;

-- Удалить функцию
DROP FUNCTION IF EXISTS public.is_admin_user();

-- Создать функцию для проверки админа
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_role TEXT;
BEGIN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid()
    LIMIT 1;
    
    IF user_email IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT role INTO user_role
    FROM public.users
    WHERE email = user_email
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'user') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Service role: полный доступ
CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Пользователи могут читать свои данные (ИСПРАВЛЕНО: правильное сравнение)
CREATE POLICY "Users read own data" ON users
    FOR SELECT 
    USING (
        email = (
            SELECT email 
            FROM auth.users 
            WHERE id = auth.uid() 
            LIMIT 1
        )
    );

-- Пользователи могут обновлять свои данные
CREATE POLICY "Users update own data" ON users
    FOR UPDATE 
    USING (
        email = (
            SELECT email 
            FROM auth.users 
            WHERE id = auth.uid() 
            LIMIT 1
        )
    );

-- Пользователи могут создавать свою запись (ИСПРАВЛЕНО: правильный WITH CHECK)
CREATE POLICY "Users insert self" ON users
    FOR INSERT 
    WITH CHECK (
        email = (
            SELECT email 
            FROM auth.users 
            WHERE id = auth.uid() 
            LIMIT 1
        )
    );

-- Админы могут читать всех пользователей
CREATE POLICY "Admins read all users" ON users
    FOR SELECT USING (public.is_admin_user());

-- Админы могут обновлять всех пользователей
CREATE POLICY "Admins update all users" ON users
    FOR UPDATE USING (public.is_admin_user());

-- Админы могут создавать пользователей
CREATE POLICY "Admins insert users" ON users
    FOR INSERT WITH CHECK (public.is_admin_user());
