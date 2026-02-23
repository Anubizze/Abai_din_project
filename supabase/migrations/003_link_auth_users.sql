-- ============================================
-- LINK SUPABASE AUTH USERS WITH USERS TABLE
-- ============================================

-- Function to automatically create user in users table when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (email, role, full_name, telegram_id)
  VALUES (
    NEW.email,
    'user', -- Default role
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULL -- telegram_id is NULL for web admin users
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    last_seen_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATE EXISTING ADMIN USER
-- ============================================
-- If you already have a user in auth.users, link it to users table
-- Run this after creating user in Supabase Auth

-- Example (replace with your actual email):
-- INSERT INTO users (email, role, full_name)
-- VALUES ('admin@example.com', 'admin', 'Admin User')
-- ON CONFLICT (email) 
-- DO UPDATE SET role = 'admin';
