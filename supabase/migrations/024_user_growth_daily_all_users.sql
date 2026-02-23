-- ============================================
-- User growth by day: count ALL users (match table "Всего пользователей")
-- Previously user_growth_daily counted only telegram_id IS NOT NULL, so chart showed 3 instead of 15.
-- ============================================

CREATE OR REPLACE VIEW user_growth_daily AS
WITH daily_new_users AS (
    SELECT
        DATE(created_at) AS activity_date,
        COUNT(*) AS new_users
    FROM users
    GROUP BY DATE(created_at)
)
SELECT
    activity_date,
    new_users,
    SUM(new_users) OVER (ORDER BY activity_date) AS total_users
FROM daily_new_users
ORDER BY activity_date;
