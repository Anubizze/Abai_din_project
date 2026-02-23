-- ============================================
-- ADD preferred_lang to users (bot language)
-- ============================================
-- Stores user's selected language for Telegram bot UI (KZ/RU/EN)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_lang TEXT
CHECK (preferred_lang IN ('kz', 'ru', 'en'));

COMMENT ON COLUMN public.users.preferred_lang IS 'User preferred language for Telegram bot: kz/ru/en';

CREATE INDEX IF NOT EXISTS idx_users_preferred_lang ON public.users(preferred_lang);

