"""Start command handler"""
from telebot import types
from bot.bot import bot
from bot.config import WELCOME_MESSAGE
from keyboards.main import get_main_keyboard
from keyboards.admin import get_admin_main_keyboard
from database.user import register_user
from utils.admin import is_admin


@bot.message_handler(commands=['start'])  # Обрабатывает /start
def handle_start(message: types.Message):
    """Handle /start command"""
    import sys
    print(f"\n{'='*60}", flush=True)
    print(f"✅✅✅ [START] ОБРАБОТЧИК /start ВЫЗВАН! ✅✅✅", flush=True)
    print(f"   От пользователя: {message.from_user.id if message.from_user else 'None'}", flush=True)
    print(f"   Имя: {message.from_user.first_name if message.from_user else 'None'}", flush=True)
    print(f"   Username: @{message.from_user.username if message.from_user else 'None'}", flush=True)
    print(f"{'='*60}\n", flush=True)
    sys.stdout.flush()
    
    try:
        user_id = message.from_user.id
        username = message.from_user.username
        first_name = message.from_user.first_name
        
        # Register user in database
        print("[INFO] Регистрация пользователя в БД...", flush=True)
        sys.stdout.flush()
        try:
            register_user(user_id, username, first_name)
            print("[OK] Пользователь зарегистрирован", flush=True)
        except Exception as db_error:
            print(f"[WARNING] Ошибка регистрации в БД (продолжаю работу): {db_error}", flush=True)
        
        # ВСЕГДА показываем обычное меню (и админам, и обычным пользователям)
        print(f"  [INFO] Показываю главное меню пользователю {user_id}", flush=True)
        sys.stdout.flush()
        
        # Send welcome message with keyboard
        try:
            keyboard = get_main_keyboard()
            print("  [INFO] Клавиатура создана, отправляю сообщение...", flush=True)
            sys.stdout.flush()
            
            # Показываем обычное меню всем (без подсказок про админ-панель)
            bot.reply_to(
                message,
                WELCOME_MESSAGE,
                reply_markup=keyboard
            )
            print("  [OK] Главное меню отправлено", flush=True)
            sys.stdout.flush()
        except Exception as send_error:
            print(f"  [ERROR] Ошибка отправки меню: {send_error}", flush=True)
            import traceback
            traceback.print_exc()
            sys.stdout.flush()
            # Try to send without keyboard as fallback
            try:
                bot.reply_to(message, WELCOME_MESSAGE)
                print("  [OK] Сообщение отправлено без клавиатуры", flush=True)
                sys.stdout.flush()
            except Exception as fallback_error:
                print(f"  [ERROR] Критическая ошибка отправки: {fallback_error}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise
    except Exception as e:
        print(f"\n[ERROR] ОШИБКА в handle_start: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        try:
            bot.reply_to(message, f"Ошибка: {e}")
        except:
            pass
