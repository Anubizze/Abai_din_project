-- ============================================
-- ПРОСТОЕ РЕШЕНИЕ RLS ДЛЯ USERS
-- Используем функцию для всех проверок
-- ============================================

-- Удалить ВСЕ политики
DROP POLICY IF EXISTS "Service role full access users" ON users;
DROP POLICY IF EXISTS "Users read own data" ON users;
DROP POLICY IF EXISTS "Admins read all users" ON users;
DROP POLICY IF EXISTS "Admins update all users" ON users;
DROP POLICY IF EXISTS "Users update own data" ON users;
DROP POLICY IF EXISTS "Admins insert users" ON users;
DROP POLICY IF EXISTS "Users insert self" ON users;

-- Удалить функцию
DROP FUNCTION IF EXISTS public.is_admin_user();
DROP FUNCTION IF EXISTS public.get_user_email();
DROP FUNCTION IF EXISTS public.can_read_user(TEXT);

-- ============================================
-- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
-- ============================================

-- Функция для получения email текущего пользователя
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Функция для проверки, может ли пользователь читать другого пользователя
CREATE OR REPLACE FUNCTION public.can_read_user(target_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_email TEXT;
    current_role TEXT;
BEGIN
    -- Получить email текущего пользователя
    current_email := public.get_user_email();
    
    IF current_email IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Если читает свои данные - разрешить
    IF current_email = target_email THEN
        RETURN TRUE;
    END IF;
    
    -- Если админ - разрешить читать всех
    SELECT role INTO current_role
    FROM public.users
    WHERE email = current_email
    LIMIT 1;
    
    RETURN COALESCE(current_role, 'user') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для проверки админа
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_role TEXT;
BEGIN
    user_email := public.get_user_email();
    
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

-- ============================================
-- RLS ПОЛИТИКИ
-- ============================================

-- Service role: полный доступ
CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Пользователи могут читать свои данные (использует функцию)
CREATE POLICY "Users read own data" ON users
    FOR SELECT 
    USING (public.can_read_user(email));

-- Пользователи могут обновлять свои данные
CREATE POLICY "Users update own data" ON users
    FOR UPDATE 
    USING (
        email = public.get_user_email()
    );

-- Пользователи могут создавать свою запись
CREATE POLICY "Users insert self" ON users
    FOR INSERT 
    WITH CHECK (
        email = public.get_user_email()
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
