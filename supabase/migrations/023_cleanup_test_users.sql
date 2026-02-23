    -- ============================================
    -- CLEANUP TEST USERS AND RELATED DATA
    -- ============================================
    -- This migration removes test users and all their associated data
    -- Test users to remove:
    -- - Alinur (telegram_id: 1796428134)
    -- - Admin User (email: admin@example.com)
    -- - User 5 (telegram_id: 569246749)
    -- - User 4 (telegram_id: 1081321148)
    -- - User 3 (telegram_id: 1842030951)
    -- - Adil (telegram_id: 1376151274)

    -- Step 1: Delete user_actions for test users (by telegram_id)
    -- Check if table exists first
    DO $$
    BEGIN
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_actions'
        ) THEN
            DELETE FROM user_actions
            WHERE telegram_id IN (
                1796428134,  -- Alinur
                569246749,   -- User 5
                1081321148,  -- User 4
                1842030951,  -- User 3
                1376151274   -- Adil
            );
        END IF;
    END $$;

-- Step 2: Delete admin_audit_logs for test users (by admin_user_id)
-- Check if table exists first (created in migration 020)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_audit_logs'
    ) THEN
        DELETE FROM admin_audit_logs
        WHERE admin_user_id IN (
            SELECT id::UUID FROM users
            WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274)
               OR email = 'admin@example.com'
        );
    END IF;
END $$;

-- Step 3: Delete audit_logs for test users (by user_id)
-- Check if table exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
    ) THEN
        DELETE FROM audit_logs
        WHERE user_id IN (
            SELECT id::UUID FROM users
            WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274)
               OR email = 'admin@example.com'
        );
    END IF;
END $$;

-- Step 4: Delete bot_settings updated by test users (by updated_by)
-- Check if table exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bot_settings'
    ) THEN
        DELETE FROM bot_settings
        WHERE updated_by IN (
            SELECT id::UUID FROM users
            WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274)
               OR email = 'admin@example.com'
        );
    END IF;
END $$;

    -- Step 5: Delete users from auth.users if they exist (for admin@example.com)
    -- Note: This requires service_role key, so it's commented out
    -- You may need to delete manually from Supabase Dashboard → Authentication
    -- DELETE FROM auth.users WHERE email = 'admin@example.com';

    -- Step 6: Delete test users from users table
    DELETE FROM users
    WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274)
    OR email = 'admin@example.com';

    -- ============================================
    -- VERIFICATION QUERIES (for manual check)
    -- ============================================
    -- Run these after migration to verify cleanup:
    -- 
    -- SELECT COUNT(*) FROM users WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274) OR email = 'admin@example.com';
    -- SELECT COUNT(*) FROM user_actions WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274);
    -- SELECT COUNT(*) FROM admin_audit_logs WHERE admin_user_id IN (SELECT id FROM users WHERE telegram_id IN (1796428134, 569246749, 1081321148, 1842030951, 1376151274) OR email = 'admin@example.com');
