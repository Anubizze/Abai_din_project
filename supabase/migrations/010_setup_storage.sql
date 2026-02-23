-- ============================================
-- SETUP SUPABASE STORAGE FOR BOT ASSETS
-- ============================================
-- 
-- This migration sets up storage bucket for bot assets (photos, etc.)
-- 
-- NOTE: Storage buckets must be created via Supabase Dashboard or API
-- Go to: Storage → Create Bucket
-- Bucket name: bot-assets
-- Public: Yes (or configure RLS policies below)
--
-- After creating the bucket, run this migration to set up RLS policies
-- ============================================

-- Storage bucket policies are managed via Supabase Dashboard
-- or through the Storage API, not SQL migrations
-- 
-- However, we can create a function to help with file management

-- Function to generate unique file path for menu photos
CREATE OR REPLACE FUNCTION generate_menu_photo_path(menu_id UUID, lang TEXT, file_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'menu-photos/' || menu_id::TEXT || '_' || lang || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || file_name;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up orphaned photos (optional helper)
-- This can be called periodically to remove photos that are no longer referenced
CREATE OR REPLACE FUNCTION cleanup_orphaned_photos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  photo_record RECORD;
BEGIN
  -- This function would need to be extended to actually delete from storage
  -- For now, it's a placeholder for future implementation
  -- Storage deletion must be done via Storage API
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment to bot_texts.photo_url to indicate it should be a Supabase Storage URL
COMMENT ON COLUMN bot_texts.photo_url IS 'URL to photo in Supabase Storage (bucket: bot-assets)';
