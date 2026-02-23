-- ============================================
-- ENHANCE USER_ACTIONS TABLE FOR ANALYTICS
-- ============================================

ALTER TABLE user_actions
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS error_occurred BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS user_lang TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_user_actions_session ON user_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_telegram_created ON user_actions(telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_actions_metadata ON user_actions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_user_actions_error ON user_actions(error_occurred) WHERE error_occurred = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_actions_type_created ON user_actions(action_type, created_at DESC);
