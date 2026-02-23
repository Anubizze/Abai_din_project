-- ============================================
-- ENHANCE USERS PROFILE FOR ANALYTICS
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS preferred_lang TEXT CHECK (preferred_lang IN ('kz', 'ru', 'en')),
ADD COLUMN IF NOT EXISTS data_verification JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS data_source JSONB DEFAULT '{}'::jsonb;

-- Indexes for profile lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_lang ON users(preferred_lang);
