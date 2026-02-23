-- ============================================
-- PRODUCTION-READY SUPABASE SCHEMA
-- Telegram Bot with Admin Panel
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    
    -- Indexes
    CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'user'))
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 2. BOT_MENUS TABLE (Menu structure)
-- ============================================
CREATE TABLE IF NOT EXISTS bot_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES bot_menus(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('menu', 'button', 'command')),
    callback_data TEXT UNIQUE,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- для дополнительных данных (photo, etc)
    
    CONSTRAINT valid_type CHECK (type IN ('menu', 'button', 'command'))
);

CREATE INDEX idx_bot_menus_parent ON bot_menus(parent_id);
CREATE INDEX idx_bot_menus_callback ON bot_menus(callback_data);
CREATE INDEX idx_bot_menus_active ON bot_menus(is_active, order_index);

-- ============================================
-- 3. BOT_TEXTS TABLE (Multilingual content)
-- ============================================
CREATE TABLE IF NOT EXISTS bot_texts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES bot_menus(id) ON DELETE CASCADE,
    lang TEXT NOT NULL DEFAULT 'kz' CHECK (lang IN ('ru', 'kz', 'en')),
    text TEXT NOT NULL,
    text_before_photo TEXT,
    text_after_photo TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_lang CHECK (lang IN ('ru', 'kz', 'en')),
    UNIQUE(menu_id, lang)
);

CREATE INDEX idx_bot_texts_menu ON bot_texts(menu_id);
CREATE INDEX idx_bot_texts_lang ON bot_texts(lang);

-- ============================================
-- 4. AUDIT_LOGS TABLE (Security & tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT, -- 'menu', 'text', 'user', etc
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- 5. USER_ACTIONS TABLE (Bot usage tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    telegram_id BIGINT,
    action_type TEXT NOT NULL, -- 'button_click', 'command', 'message'
    action_data TEXT,
    menu_id UUID REFERENCES bot_menus(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_actions_user ON user_actions(user_id);
CREATE INDEX idx_user_actions_telegram ON user_actions(telegram_id);
CREATE INDEX idx_user_actions_type ON user_actions(action_type);
CREATE INDEX idx_user_actions_created ON user_actions(created_at DESC);

-- ============================================
-- 6. BOT_SETTINGS TABLE (Global bot config)
-- ============================================
CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 7. TRIGGERS (Auto-update timestamps)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_menus_updated_at BEFORE UPDATE ON bot_menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_texts_updated_at BEFORE UPDATE ON bot_texts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: USERS
-- ============================================
-- Bot service role: full access
CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own data
CREATE POLICY "Users read own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins read all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "Admins update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES: BOT_MENUS
-- ============================================
-- Bot service role: full access
CREATE POLICY "Service role full access menus" ON bot_menus
    FOR ALL USING (auth.role() = 'service_role');

-- Anonymous (bot): read only active menus
CREATE POLICY "Bot read active menus" ON bot_menus
    FOR SELECT USING (is_active = true);

-- Admins: full access
CREATE POLICY "Admins full access menus" ON bot_menus
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Managers: read and update (no delete)
CREATE POLICY "Managers read update menus" ON bot_menus
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Managers update menus" ON bot_menus
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Managers insert menus" ON bot_menus
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- ============================================
-- RLS POLICIES: BOT_TEXTS
-- ============================================
-- Bot service role: full access
CREATE POLICY "Service role full access texts" ON bot_texts
    FOR ALL USING (auth.role() = 'service_role');

-- Anonymous (bot): read only
CREATE POLICY "Bot read texts" ON bot_texts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bot_menus
            WHERE bot_menus.id = bot_texts.menu_id AND bot_menus.is_active = true
        )
    );

-- Admins: full access
CREATE POLICY "Admins full access texts" ON bot_texts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Managers: read and update
CREATE POLICY "Managers read update texts" ON bot_texts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- ============================================
-- RLS POLICIES: AUDIT_LOGS
-- ============================================
-- Bot service role: full access (for logging)
CREATE POLICY "Service role full access audit" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Admins: read only
CREATE POLICY "Admins read audit" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES: USER_ACTIONS
-- ============================================
-- Bot service role: full access (for logging)
CREATE POLICY "Service role full access actions" ON user_actions
    FOR ALL USING (auth.role() = 'service_role');

-- Admins: read only
CREATE POLICY "Admins read actions" ON user_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES: BOT_SETTINGS
-- ============================================
-- Bot service role: read only
CREATE POLICY "Service role read settings" ON bot_settings
    FOR SELECT USING (auth.role() = 'service_role');

-- Admins: full access
CREATE POLICY "Admins full access settings" ON bot_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- 9. INITIAL DATA (Optional)
-- ============================================
-- Insert default admin user (password should be set via Supabase Auth)
-- This is just a placeholder - actual admin should be created via Supabase Auth UI

-- Insert default bot settings
INSERT INTO bot_settings (key, value, description) VALUES
    ('welcome_message', '{"kz": "Қош келдіңіз!", "ru": "Добро пожаловать!", "en": "Welcome!"}', 'Welcome message for /start command'),
    ('social_links', '{"instagram": [], "telegram": "", "tiktok": "", "email": ""}', 'Social media links')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 10. HELPER FUNCTIONS
-- ============================================
-- Function to get menu tree
CREATE OR REPLACE FUNCTION get_menu_tree(parent_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    parent_id UUID,
    type TEXT,
    callback_data TEXT,
    order_index INTEGER,
    is_active BOOLEAN,
    texts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.parent_id,
        m.type,
        m.callback_data,
        m.order_index,
        m.is_active,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'lang', t.lang,
                    'text', t.text,
                    'text_before_photo', t.text_before_photo,
                    'text_after_photo', t.text_after_photo,
                    'photo_url', t.photo_url
                )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::jsonb
        ) as texts
    FROM bot_menus m
    LEFT JOIN bot_texts t ON m.id = t.menu_id
    WHERE (parent_uuid IS NULL AND m.parent_id IS NULL)
       OR (parent_uuid IS NOT NULL AND m.parent_id = parent_uuid)
    GROUP BY m.id, m.parent_id, m.type, m.callback_data, m.order_index, m.is_active
    ORDER BY m.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
