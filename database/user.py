"""User database operations"""
from datetime import datetime
from typing import Optional
from database.connection import get_supabase


def register_user(telegram_id: int, username: Optional[str], first_name: Optional[str]) -> bool:
    """Register new user or update existing user"""
    try:
        supabase = get_supabase()
        if not supabase:
            print("  ⚠️ Supabase не подключен, пропускаю регистрацию")
            return False
        # Check if user exists
        result = supabase.table('users').select('*').eq('telegram_id', telegram_id).execute()
        
        if result.data and len(result.data) > 0:
            # Update existing user
            user = result.data[0]
            supabase.table('users').update({
                'username': username,
                'first_name': first_name,
                'last_interaction_at': datetime.now().isoformat(),
                'total_interactions': (user.get('total_interactions', 0) or 0) + 1
            }).eq('telegram_id', telegram_id).execute()
            return True
        
        # Create new user
        user_data = {
            'telegram_id': telegram_id,
            'username': username,
            'first_name': first_name,
            'first_interaction_at': datetime.now().isoformat(),
            'last_interaction_at': datetime.now().isoformat(),
            'total_interactions': 1,
            'date_joined': datetime.now().date().isoformat()
        }
        
        supabase.table('users').insert(user_data).execute()
        
        # Log registration action
        log_user_action(telegram_id, 'registration', 'user_registered')
        
        return True
    except Exception as e:
        print(f"  ❌ Ошибка при регистрации пользователя: {e}")
        import traceback
        traceback.print_exc()
        return False


def log_user_action(telegram_id: int, action_type: str, action_value: Optional[str] = None):
    """Log user action"""
    supabase = get_supabase()
    if not supabase:
        return
    
    try:
        # Get user_id
        user_result = supabase.table('users').select('id').eq('telegram_id', telegram_id).execute()
        user_id = None
        if user_result.data and len(user_result.data) > 0:
            user_id = user_result.data[0].get('id')
        
        # Insert action log
        action_data = {
            'user_id': user_id,
            'telegram_id': telegram_id,
            'action_type': action_type,
            'action_value': action_value,
            'created_at': datetime.now().isoformat()
        }
        
        supabase.table('user_actions').insert(action_data).execute()
        
        # Update user's last interaction
        if user_id:
            supabase.table('users').update({
                'last_interaction_at': datetime.now().isoformat()
            }).eq('telegram_id', telegram_id).execute()
            
    except Exception as e:
        print(f"Ошибка при логировании действия: {e}")
