-- ============================================
-- SETUP STORAGE RLS POLICIES FOR bot-assets
-- ============================================
-- 
-- ВАЖНО: Этот файл создает RLS политики для Storage bucket "bot-assets"
-- 
-- Storage политики в Supabase настраиваются через специальные функции
-- Однако, если bucket уже создан как Public, эти политики могут не понадобиться
--
-- Если bucket НЕ Public, выполните этот SQL для создания политик
-- ============================================

-- ============================================
-- ВАЖНО: Сначала удалите существующие политики, если они есть
-- ============================================
-- Выполните вручную в Supabase Dashboard → SQL Editor:
-- DROP POLICY IF EXISTS "Public read access for bot-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can upload to bot-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can update bot-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can delete from bot-assets" ON storage.objects;
-- ============================================

-- Политика для чтения файлов (все пользователи, включая анонимных)
-- Это нужно только если bucket НЕ Public, но не помешает если Public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for bot-assets'
  ) THEN
    CREATE POLICY "Public read access for bot-assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'bot-assets');
  END IF;
END $$;

-- Политика для загрузки файлов (только авторизованные пользователи)
-- ЭТО КРИТИЧНО ДЛЯ ЗАГРУЗКИ ФАЙЛОВ!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload to bot-assets'
  ) THEN
    CREATE POLICY "Authenticated users can upload to bot-assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'bot-assets' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- Политика для обновления файлов (только авторизованные пользователи)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update bot-assets'
  ) THEN
    CREATE POLICY "Authenticated users can update bot-assets"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'bot-assets' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- Политика для удаления файлов (только авторизованные пользователи)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete from bot-assets'
  ) THEN
    CREATE POLICY "Authenticated users can delete from bot-assets"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'bot-assets' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- Примечание: Если bucket настроен как Public в Supabase Dashboard,
-- политики для SELECT могут быть не нужны, но политики для INSERT/UPDATE/DELETE
-- все равно нужны для авторизованных пользователей
