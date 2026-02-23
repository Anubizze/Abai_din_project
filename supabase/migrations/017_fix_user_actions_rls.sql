-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ USER_ACTIONS
-- Используем функцию is_admin_user() вместо прямой проверки users
-- ============================================

-- Удалить старую политику, которая вызывает рекурсивную проблему
DROP POLICY IF EXISTS "Admins read actions" ON user_actions;

-- Создать новую политику с использованием функции is_admin_user()
-- Эта функция уже существует в миграции 008_simple_users_rls.sql
-- и использует SECURITY DEFINER для обхода RLS при проверке роли
CREATE POLICY "Admins read actions" ON user_actions
    FOR SELECT USING (public.is_admin_user());

-- Комментарий для документации
COMMENT ON POLICY "Admins read actions" ON user_actions IS 
    'Администраторы могут читать все действия пользователей. Использует функцию is_admin_user() для проверки роли без рекурсивных проблем RLS.';
