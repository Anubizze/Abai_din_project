-- ============================================
-- FIX USERS TABLE: Make telegram_id nullable
-- ============================================

-- Remove NOT NULL constraint from telegram_id if it exists
DO $$ 
BEGIN
    -- Check if telegram_id has NOT NULL constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'telegram_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Make telegram_id nullable
        ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;
    END IF;
END $$;

-- ============================================
-- CREATE ADMIN USER
-- ============================================
-- This will work now that telegram_id is nullable
INSERT INTO users (email, role, full_name, telegram_id)
VALUES ('admin@example.com', 'admin', 'Admin User', NULL)
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'admin',
    full_name = COALESCE(EXCLUDED.full_name, users.full_name);
