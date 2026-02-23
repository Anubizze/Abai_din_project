-- ============================================
-- ADD TELEGRAM METADATA TO USERS
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tg_username TEXT,
ADD COLUMN IF NOT EXISTS tg_first_name TEXT,
ADD COLUMN IF NOT EXISTS tg_last_name TEXT,
ADD COLUMN IF NOT EXISTS tg_language_code TEXT,
ADD COLUMN IF NOT EXISTS tg_is_premium BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_is_bot BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_is_fake BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_is_scam BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_photo_id TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS data_verification JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS data_source JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_tg_username ON users(tg_username);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
-- ============================================
-- ADD TELEGRAM METADATA TO USERS
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tg_username TEXT,
ADD COLUMN IF NOT EXISTS tg_first_name TEXT,
ADD COLUMN IF NOT EXISTS tg_last_name TEXT,
ADD COLUMN IF NOT EXISTS tg_language_code TEXT,
ADD COLUMN IF NOT EXISTS tg_is_premium BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_is_bot BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_is_fake BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_is_scam BOOLEAN,
ADD COLUMN IF NOT EXISTS tg_photo_id TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- data_verification / data_source already exist in 019, keep if missing
ALTER TABLE users
ADD COLUMN IF NOT EXISTS data_verification JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS data_source JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_tg_username ON users(tg_username);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
