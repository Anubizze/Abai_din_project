-- ============================================
-- ANALYTICS MATERIALIZED VIEWS AND FUNCTIONS
-- ============================================

-- Daily activity view for DAU/WAU/MAU
CREATE MATERIALIZED VIEW IF NOT EXISTS user_daily_activity AS
SELECT
    DATE(created_at) AS activity_date,
    COUNT(DISTINCT telegram_id) AS unique_users,
    COUNT(*) AS total_actions
FROM user_actions
WHERE telegram_id IS NOT NULL
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_daily_activity_date ON user_daily_activity(activity_date);

-- User profile summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_profiles_summary AS
SELECT
    u.telegram_id,
    u.id AS user_id,
    u.username,
    u.full_name,
    u.phone_number,
    u.preferred_lang,
    u.created_at AS first_interaction,
    u.last_seen_at AS last_activity,
    COUNT(DISTINCT DATE(ua.created_at)) AS active_days,
    COUNT(ua.id) AS total_actions,
    COUNT(DISTINCT ua.action_type) AS unique_action_types,
    COUNT(DISTINCT ua.menu_id) AS unique_menus_accessed,
    COUNT(DISTINCT ua.session_id) AS unique_sessions,
    MIN(ua.created_at) AS first_action_time,
    MAX(ua.created_at) AS last_action_time,
    AVG(ua.response_time_ms) AS avg_response_time_ms,
    COUNT(CASE WHEN ua.error_occurred THEN 1 END) AS error_count
FROM users u
LEFT JOIN user_actions ua ON u.telegram_id = ua.telegram_id
WHERE u.telegram_id IS NOT NULL
GROUP BY
    u.telegram_id, u.id, u.username, u.full_name, u.phone_number,
    u.preferred_lang, u.created_at, u.last_seen_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_summary_telegram ON user_profiles_summary(telegram_id);

-- Per-user daily activity
CREATE OR REPLACE VIEW user_activity_daily AS
SELECT
    telegram_id,
    DATE(created_at) AS activity_date,
    COUNT(*) AS actions_count
FROM user_actions
WHERE telegram_id IS NOT NULL
GROUP BY telegram_id, DATE(created_at);

-- Per-user hourly activity
CREATE OR REPLACE VIEW user_activity_hourly AS
SELECT
    telegram_id,
    DATE(created_at) AS activity_date,
    EXTRACT(HOUR FROM created_at) AS activity_hour,
    COUNT(*) AS actions_count
FROM user_actions
WHERE telegram_id IS NOT NULL
GROUP BY telegram_id, DATE(created_at), EXTRACT(HOUR FROM created_at);

-- Per-user anomaly detection (basic z-score)
CREATE OR REPLACE VIEW user_activity_anomalies AS
WITH daily_counts AS (
    SELECT
        telegram_id,
        DATE(created_at) AS activity_date,
        COUNT(*) AS actions_count
    FROM user_actions
    WHERE telegram_id IS NOT NULL
    GROUP BY telegram_id, DATE(created_at)
),
stats AS (
    SELECT
        telegram_id,
        AVG(actions_count) AS avg_actions,
        STDDEV_SAMP(actions_count) AS stddev_actions
    FROM daily_counts
    GROUP BY telegram_id
)
SELECT
    d.telegram_id,
    d.activity_date,
    d.actions_count,
    s.avg_actions,
    s.stddev_actions,
    CASE
        WHEN s.stddev_actions IS NULL OR s.stddev_actions = 0 THEN NULL
        ELSE (d.actions_count - s.avg_actions) / s.stddev_actions
    END AS z_score
FROM daily_counts d
JOIN stats s ON s.telegram_id = d.telegram_id
WHERE s.stddev_actions IS NOT NULL
  AND s.stddev_actions > 0
  AND d.actions_count > s.avg_actions + (3 * s.stddev_actions);

-- Metrics view for DAU/WAU/MAU
CREATE OR REPLACE VIEW analytics_metrics AS
WITH daily_stats AS (
    SELECT
        DATE(created_at) AS date,
        COUNT(DISTINCT telegram_id) AS dau
    FROM user_actions
    WHERE telegram_id IS NOT NULL
    GROUP BY DATE(created_at)
),
rolling_7d AS (
    SELECT
        date,
        dau,
        SUM(dau) OVER (
            ORDER BY date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS wau_estimate
    FROM daily_stats
),
rolling_30d AS (
    SELECT
        date,
        dau,
        wau_estimate,
        SUM(dau) OVER (
            ORDER BY date
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) AS mau_estimate
    FROM rolling_7d
)
SELECT
    date,
    dau,
    wau_estimate AS wau,
    mau_estimate AS mau,
    LAG(dau, 1) OVER (ORDER BY date) AS dau_previous,
    LAG(dau, 7) OVER (ORDER BY date) AS dau_week_ago
FROM rolling_30d
ORDER BY date DESC;

-- Totals view
CREATE OR REPLACE VIEW analytics_totals AS
SELECT
    (SELECT COUNT(*) FROM users WHERE telegram_id IS NOT NULL) AS total_users,
    (SELECT COUNT(*) FROM user_actions) AS total_actions,
    (SELECT COUNT(DISTINCT session_id) FROM user_actions WHERE session_id IS NOT NULL) AS total_sessions,
    (SELECT COUNT(*) FROM user_actions WHERE error_occurred = TRUE) AS total_errors;

-- Top buttons view
CREATE OR REPLACE VIEW top_buttons_summary AS
SELECT
    m.callback_data,
    COUNT(*) AS count
FROM user_actions ua
JOIN bot_menus m ON m.id = ua.menu_id
WHERE ua.action_type = 'button_click'
  AND ua.menu_id IS NOT NULL
GROUP BY m.callback_data
ORDER BY count DESC;

-- Top languages view
CREATE OR REPLACE VIEW top_languages_summary AS
SELECT
    preferred_lang AS lang,
    COUNT(*) AS count
FROM users
WHERE preferred_lang IS NOT NULL
GROUP BY preferred_lang
ORDER BY count DESC;

-- Hourly activity summary (global)
CREATE OR REPLACE VIEW hourly_activity_summary AS
SELECT
    EXTRACT(HOUR FROM created_at) AS activity_hour,
    COUNT(*) AS actions_count
FROM user_actions
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY activity_hour;

-- User growth by day (global)
CREATE OR REPLACE VIEW user_growth_daily AS
WITH daily_new_users AS (
    SELECT
        DATE(created_at) AS activity_date,
        COUNT(*) AS new_users
    FROM users
    WHERE telegram_id IS NOT NULL
    GROUP BY DATE(created_at)
)
SELECT
    activity_date,
    new_users,
    SUM(new_users) OVER (ORDER BY activity_date) AS total_users
FROM daily_new_users
ORDER BY activity_date;

-- Retention function
CREATE OR REPLACE FUNCTION calculate_retention(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    cohort_date DATE,
    day_number INTEGER,
    retained_users BIGINT,
    retention_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH first_actions AS (
        SELECT
            telegram_id,
            DATE(MIN(created_at)) AS first_date
        FROM user_actions
        WHERE telegram_id IS NOT NULL
        GROUP BY telegram_id
    ),
    daily_activity AS (
        SELECT
            fa.telegram_id,
            fa.first_date AS cohort_date,
            DATE(ua.created_at) AS activity_date,
            DATE(ua.created_at) - fa.first_date AS day_number
        FROM first_actions fa
        JOIN user_actions ua ON fa.telegram_id = ua.telegram_id
        WHERE DATE(ua.created_at) - fa.first_date <= p_days
    )
    SELECT
        cohort_date,
        day_number::INTEGER,
        COUNT(DISTINCT telegram_id)::BIGINT AS retained_users,
        ROUND(
            COUNT(DISTINCT telegram_id)::NUMERIC /
            NULLIF((
                SELECT COUNT(DISTINCT telegram_id)
                FROM first_actions
                WHERE first_date = cohort_date
            ), 0) * 100,
            2
        ) AS retention_rate
    FROM daily_activity
    GROUP BY cohort_date, day_number
    ORDER BY cohort_date DESC, day_number;
END;
$$ LANGUAGE plpgsql;

-- Retention summary (latest cohort, day 1/7/30)
CREATE OR REPLACE VIEW retention_summary AS
WITH retention AS (
    SELECT * FROM calculate_retention(30)
),
latest_cohort AS (
    SELECT MAX(cohort_date) AS cohort_date FROM retention
)
SELECT
    r.cohort_date,
    r.day_number,
    r.retention_rate
FROM retention r
JOIN latest_cohort lc ON r.cohort_date = lc.cohort_date
WHERE r.day_number IN (1, 7, 30)
ORDER BY r.day_number;

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_daily_activity;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_profiles_summary;
END;
$$ LANGUAGE plpgsql;
