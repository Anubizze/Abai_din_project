"""Admin middleware - intercepts admin messages"""
from telebot import types
from bot.bot import bot
from utils.admin import is_admin
from admin.handlers import handle_admin_access


# Импортируем список ожидающих кода из handlers.admin
from handlers.admin import _waiting_for_code

# Admin middleware должен срабатывать ПОСЛЕ обработчика кнопок меню (низкий приоритет)
@bot.message_handler(func=lambda message: message.from_user and message.text and not message.text.startswith('/start') and not message.text.startswith('/admin'), priority=50)
def admin_middleware(message: types.Message):
    """Intercept messages from admins before other handlers (except /start and /admin)"""
    import sys
    try:
        user_id = message.from_user.id
        text = message.text
        
        # Пропускаем, если пользователь ожидает ввода кода (это обрабатывается в handlers.admin)
        if user_id in _waiting_for_code:
            print(f"  [ADMIN MIDDLEWARE] Пользователь {user_id} ожидает ввода кода, пропускаю", flush=True)
            sys.stdout.flush()
            return
        
        print(f"\n{'='*60}", flush=True)
        print(f"[ADMIN MIDDLEWARE] Получено сообщение", flush=True)
        print(f"   От пользователя: {user_id}", flush=True)
        print(f"   Текст: '{text}'", flush=True)
        sys.stdout.flush()
        
        # Проверяем, является ли пользователь админом
        admin_check = is_admin(user_id)
        print(f"   is_admin({user_id}) = {admin_check}", flush=True)
        sys.stdout.flush()
        
        if not admin_check:
            # Не админ - пропускаем дальше к обычным обработчикам
            print("   ⏭️ Не админ, пропускаю дальше к обычным обработчикам", flush=True)
            sys.stdout.flush()
            return
        
        # Проверяем, не является ли это кнопкой обычного меню
        from handlers.menu import MENU_RESPONSES
        if text and text in MENU_RESPONSES:
            # Это кнопка обычного меню - пропускаем к обработчикам меню
            print(f"   ⏭️ Админ нажал обычную кнопку меню '{text}', пропускаю к обработчикам меню", flush=True)
            sys.stdout.flush()
            return
        
        # Админ - проверяем, это кнопка админ-панели?
        # Список кнопок админ-панели
        admin_buttons = [
            "📊 Статистика",
            "👥 Активные сегодня",
            "📁 Архив по дате",
            "🚪 Выйти из админ-панели",
            "🔙 Назад"
        ]
        
        # Если это кнопка админ-панели - обрабатываем
        if text and (text in admin_buttons or text.startswith("📅 ")):
            print(f"   ✅ Это админ! Кнопка админ-панели, обрабатываю", flush=True)
            sys.stdout.flush()
            result = handle_admin_access(message)
            if result:
                print("   [OK] Админ-панель обработала сообщение", flush=True)
            else:
                print("   [WARNING] Админ-панель не обработала сообщение", flush=True)
            sys.stdout.flush()
            # Message is handled, other handlers won't process it
        else:
            # Неизвестное сообщение - пропускаем
            print(f"   ⏭️ Неизвестное сообщение от админа, пропускаю", flush=True)
            sys.stdout.flush()
            return
        
    except Exception as e:
        print(f"\n[ERROR] ОШИБКА в admin_middleware: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()