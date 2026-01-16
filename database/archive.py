"""Archive operations for daily user archiving"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from database.connection import get_supabase


def archive_daily_users(archive_date: Optional[date] = None) -> bool:
    """
    Archive users from active_users to archive_users for a specific date.
    By default archives yesterday's users.
    """
    supabase = get_supabase()
    if not supabase:
        return False
    
    # Default to yesterday if no date provided
    if archive_date is None:
        archive_date = date.today() - timedelta(days=1)
    
    archive_date_str = archive_date.isoformat()
    
    try:
        # Get users who joined on the archive date
        users_result = supabase.table('users').select('*').eq('date_joined', archive_date_str).execute()
        
        if not users_result.data:
            print(f"Нет пользователей для архивации за {archive_date_str}")
            return True
        
        # Archive each user
        archived_count = 0
        for user in users_result.data:
            archive_data = {
                'telegram_id': user.get('telegram_id'),
                'username': user.get('username'),
                'first_name': user.get('first_name'),
                'date_joined': archive_date_str,
                'total_interactions': user.get('total_interactions', 0),
                'archived_at': datetime.now().isoformat(),
                'archive_date': archive_date_str
            }
            
            # Insert into archive (assuming archive_users table exists)
            # Note: This assumes archive_users table has similar structure
            try:
                supabase.table('archive_users').insert(archive_data).execute()
                archived_count += 1
            except Exception as e:
                print(f"Ошибка при архивации пользователя {user.get('telegram_id')}: {e}")
        
        print(f"✅ Заархивировано {archived_count} пользователей за {archive_date_str}")
        return True
        
    except Exception as e:
        print(f"Ошибка при архивации пользователей: {e}")
        return False


def get_archive_by_date(archive_date: date) -> List[Dict]:
    """Get archived users for a specific date"""
    supabase = get_supabase()
    if not supabase:
        return []
    
    try:
        result = supabase.table('archive_users').select('*').eq('archive_date', archive_date.isoformat()).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"Ошибка при получении архива: {e}")
        return []


def get_active_users_today() -> List[Dict]:
    """Get active users for today"""
    supabase = get_supabase()
    if not supabase:
        return []
    
    try:
        today = date.today().isoformat()
        result = supabase.table('users').select('*').eq('date_joined', today).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"Ошибка при получении активных пользователей: {e}")
        return []
