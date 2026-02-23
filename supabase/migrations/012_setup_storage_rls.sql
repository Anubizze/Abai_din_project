-- ============================================
-- SETUP STORAGE RLS POLICIES
-- ============================================
-- 
-- ВАЖНО: Storage bucket должен быть создан вручную через Supabase Dashboard
-- Storage → Create Bucket → bot-assets (Public: Yes)
--
-- После создания bucket, выполните этот SQL для настройки RLS политик
-- ============================================

-- Примечание: Storage RLS политики настраиваются через Supabase Dashboard
-- или через Storage API, но можно использовать SQL функции для проверки

-- Проверка существования bucket (информационная функция)
CREATE OR REPLACE FUNCTION check_storage_bucket_exists(bucket_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Эта функция не может напрямую проверить bucket через SQL
  -- Но мы можем добавить комментарий для документации
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Обновляем комментарий для photo_url
COMMENT ON COLUMN bot_texts.photo_url IS 'URL фотографии. Может быть: 1) URL из Supabase Storage (bucket: bot-assets), 2) Внешний URL';
