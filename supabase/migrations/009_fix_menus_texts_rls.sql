-- Fix RLS policies for bot_menus and bot_texts to use email-based role checks
-- Similar to the fix we did for users table

-- Drop existing policies
DROP POLICY IF EXISTS "Admins full access menus" ON bot_menus;
DROP POLICY IF EXISTS "Managers read update menus" ON bot_menus;
DROP POLICY IF EXISTS "Managers update menus" ON bot_menus;
DROP POLICY IF EXISTS "Managers insert menus" ON bot_menus;

DROP POLICY IF EXISTS "Admins full access texts" ON bot_texts;
DROP POLICY IF EXISTS "Managers read update texts" ON bot_texts;

-- Create new policies using email-based role check
-- Admins: full access to menus
CREATE POLICY "Admins full access menus" ON bot_menus
    FOR ALL USING (public.is_admin_user());

-- Managers: read and update menus
CREATE POLICY "Managers read update menus" ON bot_menus
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = public.get_user_email() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Managers update menus" ON bot_menus
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = public.get_user_email() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Managers insert menus" ON bot_menus
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = public.get_user_email() 
            AND role IN ('admin', 'manager')
        )
    );

-- Admins: full access to texts
CREATE POLICY "Admins full access texts" ON bot_texts
    FOR ALL USING (public.is_admin_user());

-- Managers: read and update texts
CREATE POLICY "Managers read update texts" ON bot_texts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = public.get_user_email() 
            AND role IN ('admin', 'manager')
        )
    );
