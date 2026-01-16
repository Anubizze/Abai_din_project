"""
Daily archive script
Run this script daily via cron to archive users
"""
from database.archive import archive_daily_users
from datetime import date


if __name__ == '__main__':
    print("🔄 Начало ежедневной архивации...")
    
    # Archive yesterday's users (default)
    success = archive_daily_users()
    
    if success:
        print("✅ Архивация завершена успешно")
    else:
        print("❌ Ошибка при архивации")
