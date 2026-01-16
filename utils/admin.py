"""Admin utilities"""
from bot.config import ADMIN_IDS


def is_admin(user_id: int) -> bool:
    """Check if user is admin"""
    result = user_id in ADMIN_IDS
    # Убираем print из is_admin - он вызывается слишком часто в фильтрах
    return result
