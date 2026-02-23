-- ============================================
-- ПРОСТАЯ ВЕРСИЯ: Storage RLS политики для bot-assets
-- ============================================
-- 
-- ВАЖНО: Даже если bucket Public, для загрузки (INSERT) нужны RLS политики!
-- 
-- Выполните этот SQL в Supabase Dashboard → SQL Editor
-- ============================================

-- Удаляем старые политики, если они есть (чтобы избежать конфликтов)
DROP POLICY IF EXISTS "Public read access for bot-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to bot-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update bot-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from bot-assets" ON storage.objects;

-- Политика для чтения файлов (все могут читать, если bucket Public)
CREATE POLICY "Public read access for bot-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'bot-assets');

-- Политика для загрузки файлов (только авторизованные пользователи)
-- ЭТО КРИТИЧНО ДЛЯ ЗАГРУЗКИ ФАЙЛОВ С КОМПЬЮТЕРА!
CREATE POLICY "Authenticated users can upload to bot-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bot-assets' 
  AND auth.role() = 'authenticated'
);

-- Политика для обновления файлов
CREATE POLICY "Authenticated users can update bot-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'bot-assets' 
  AND auth.role() = 'authenticated'
);

-- Политика для удаления файлов
CREATE POLICY "Authenticated users can delete from bot-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bot-assets' 
  AND auth.role() = 'authenticated'
);
