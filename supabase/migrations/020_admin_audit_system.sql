-- ============================================
-- ADMIN AUDIT LOGGING SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'view_user', 'export_data', 'view_analytics', 'login', 'logout'
    entity_type TEXT, -- 'user', 'analytics', 'export'
    entity_id TEXT, -- telegram_id or other identifier
    ip_address INET NOT NULL,
    user_agent TEXT,
    request_path TEXT,
    request_params JSONB DEFAULT '{}'::jsonb,
    response_status INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs" ON admin_audit_logs
    FOR SELECT USING (public.is_admin_user());

CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_user_id UUID,
    p_action_type TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_path TEXT DEFAULT NULL,
    p_request_params JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_audit_logs (
        admin_user_id, action_type, entity_type, entity_id,
        ip_address, user_agent, request_path, request_params
    ) VALUES (
        p_admin_user_id, p_action_type, p_entity_type, p_entity_id,
        p_ip_address, p_user_agent, p_request_path, p_request_params
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
