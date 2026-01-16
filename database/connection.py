"""Database connection"""
from typing import Optional, Any
from supabase._sync.client import create_client
from bot.config import SUPABASE_URL, SUPABASE_KEY


# Global supabase client
_supabase: Optional[Any] = None


def get_supabase() -> Optional[Any]:
    """Get or create supabase client"""
    global _supabase
    
    if _supabase is None:
        try:
            if SUPABASE_URL != "YOUR_SUPABASE_URL" and SUPABASE_KEY != "YOUR_SUPABASE_KEY":
                _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                print("✅ Supabase подключен успешно")
            else:
                print("⚠️ Supabase не настроен")
                return None
        except Exception as e:
            print(f"❌ Ошибка подключения к Supabase: {e}")
            return None
    
    return _supabase
