"""Default message handler"""
from telebot import types
from bot.bot import bot
from keyboards.main import get_main_keyboard
from database.user import log_user_action
from utils.admin import is_admin



@bot.message_handler(func=lambda message: True, priority=1)  # Lowest priority - обрабатывает только то, что не обработали другие
def handle_default(message: types.Message):
    """Handle all other messages"""
    import sys
    print(f"🔔 Default handler: сообщение от {message.from_user.id}, текст: {message.text}", flush=True)
    sys.stdout.flush()
    user_id = message.from_user.id
    
    # Проверяем, не ожидает ли пользователь ввода кода админки
    from handlers.admin import _waiting_for_code
    if user_id in _waiting_for_code:
        print("  ⏭️ Пропускаю - пользователь ожидает ввода кода", flush=True)
        sys.stdout.flush()
        return
    
    # Проверяем, не является ли это кнопкой меню
    from handlers.menu import MENU_RESPONSES
    if message.text and message.text in MENU_RESPONSES:
        print("  ⏭️ Пропускаю - это кнопка меню, обработает menu handler", flush=True)
        sys.stdout.flush()
        return
    
    # Проверяем, не является ли это кнопкой админ-панели
    admin_buttons = [
        "📊 Статистика",
        "👥 Активные сегодня",
        "📁 Архив по дате",
        "🚪 Выйти из админ-панели",
        "🔙 Назад"
    ]
    if message.text and (message.text in admin_buttons or message.text.startswith("📅 ")):
        print("  ⏭️ Пропускаю - это кнопка админ-панели", flush=True)
        sys.stdout.flush()
        return
    
    # Skip admin messages - they are handled by admin middleware
    if is_admin(user_id):
        print("  ⏭️ Пропускаю - это админ, обработает admin middleware", flush=True)
        sys.stdout.flush()
        return  # Let admin middleware handle it
    
    print("  👤 Обрабатываю как обычное сообщение", flush=True)
    sys.stdout.flush()
    
    # Log user action
    try:
        log_user_action(user_id, 'message', message.text)
    except Exception as e:
        print(f"  [WARNING] Ошибка логирования: {e}", flush=True)
        sys.stdout.flush()
    
    # Send default response
    bot.reply_to(
        message,
        "Қолдану үшін төмендегі кнопкаларды пайдаланыңыз немесе /start командасын жазыңыз.",
        reply_markup=get_main_keyboard()
    )
