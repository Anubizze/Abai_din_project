-- ============================================
-- ПРОСТОЕ УДАЛЕНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ
-- Скопируйте этот скрипт и выполните в Supabase SQL Editor
-- ============================================

-- Шаг 1: Удаляем действия пользователей (user_actions)
DELETE FROM user_actions
WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274);

-- Шаг 2: Удаляем логи аудита (audit_logs) - только для тестовых пользователей
-- Используем EXISTS для обхода проблемы с типами
DELETE FROM audit_logs
WHERE EXISTS (
    SELECT 1 FROM users 
    WHERE users.telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274)
      AND audit_logs.user_id::text = users.id::text
);

-- Шаг 3: Удаляем настройки бота, обновленные тестовыми пользователями
DELETE FROM bot_settings
WHERE EXISTS (
    SELECT 1 FROM users 
    WHERE users.telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274)
      AND bot_settings.updated_by::text = users.id::text
);

-- Шаг 4: Удаляем только тестовых пользователей (НЕ админа)
DELETE FROM users
WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274);

-- Шаг 5: Обновляем материализованные представления (views)
-- Это нужно, чтобы удалить данные из аналитических представлений
REFRESH MATERIALIZED VIEW CONCURRENTLY user_profiles_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY user_daily_activity;

-- ============================================
-- ПРОВЕРКА: должны вернуть 0 (админ останется)
-- ============================================
SELECT COUNT(*) as remaining_test_users 
FROM users 
WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274);

-- Проверка материализованного представления
SELECT COUNT(*) as remaining_in_summary
FROM user_profiles_summary
WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274);
