"""Admin command handler - /admin для входа в админ-панель"""
from telebot import types
from bot.bot import bot
from utils.admin import is_admin
from keyboards.main import get_main_keyboard
from bot.config import WELCOME_MESSAGE, ADMIN_SECRET_CODE
import sys

# Хранилище для пользователей, ожидающих ввода кода
# Формат: {user_id: True} - пользователь ожидает ввода кода
_waiting_for_code: dict[int, bool] = {}


@bot.message_handler(commands=['admin'])
def handle_admin_command(message: types.Message):
    """Handle /admin command - вход в админ-панель"""
    try:
        user_id = message.from_user.id
        
        print(f"\n{'='*60}", flush=True)
        print(f"[ADMIN COMMAND] Команда /admin от пользователя {user_id}", flush=True)
        sys.stdout.flush()
        
        # Проверяем, является ли пользователь админом
        from bot.config import ADMIN_IDS
        admin_check = is_admin(user_id)
        print(f"  [DEBUG] Проверка админа: is_admin({user_id}) = {admin_check}", flush=True)
        print(f"  [DEBUG] Список админов: {ADMIN_IDS}", flush=True)
        print(f"  [DEBUG] Ваш ID: {user_id}", flush=True)
        sys.stdout.flush()
        
        if not admin_check:
            print(f"  [WARNING] Пользователь {user_id} не является админом", flush=True)
            sys.stdout.flush()
            bot.reply_to(
                message,
                f"❌ У вас нет доступа к админ-панели.\n\n"
                f"Ваш ID: {user_id}\n"
                f"Доступ имеют только пользователи из списка администраторов.\n\n"
                f"Проверьте файл bot/config.py, список ADMIN_IDS."
            )
            return
        
        # Админ - запрашиваем секретный код
        print(f"  [OK] Пользователь {user_id} - админ, запрашиваю секретный код", flush=True)
        sys.stdout.flush()
        
        # Помечаем, что пользователь ожидает ввода кода
        _waiting_for_code[user_id] = True
        
        bot.reply_to(
            message,
            "🔐 Для входа в админ-панель введите секретный код:\n\n"
            "Отправьте код в следующем сообщении."
        )
        
        print(f"  [OK] Запрос кода отправлен пользователю {user_id}", flush=True)
        sys.stdout.flush()
        
    except Exception as e:
        print(f"\n[ERROR] ОШИБКА в handle_admin_command: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        try:
            bot.reply_to(message, f"Ошибка: {e}")
        except:
            pass


# Обработчик кода должен срабатывать ПЕРВЫМ (самый высокий приоритет)
@bot.message_handler(func=lambda message: message.from_user and message.from_user.id in _waiting_for_code, priority=10000)
def handle_admin_code(message: types.Message):
    """Handle admin secret code input"""
    import sys
    try:
        user_id = message.from_user.id
        
        print(f"\n{'='*60}", flush=True)
        print(f"[ADMIN CODE HANDLER] ОБРАБОТЧИК КОДА ВЫЗВАН!", flush=True)
        print(f"   Пользователь: {user_id}", flush=True)
        print(f"   Текст: '{message.text}'", flush=True)
        sys.stdout.flush()
        
        if not message.text:
            _waiting_for_code.pop(user_id, None)
            bot.reply_to(message, "❌ Код не может быть пустым. Попробуйте снова: /admin")
            return
        
        entered_code = message.text.strip()
        
        print(f"   Введенный код: '{entered_code}'", flush=True)
        print(f"   Ожидаемый код: '{ADMIN_SECRET_CODE}'", flush=True)
        sys.stdout.flush()
        
        # Проверяем код
        if entered_code == ADMIN_SECRET_CODE:
            print(f"  [OK] Код правильный! Открываю админ-панель", flush=True)
            sys.stdout.flush()
            
            # Убираем из ожидающих
            _waiting_for_code.pop(user_id, None)
            print(f"  [DEBUG] Убрал пользователя {user_id} из ожидающих", flush=True)
            sys.stdout.flush()
            
            # Показываем админ-панель
            print(f"  [DEBUG] Импортирую show_admin_main_menu...", flush=True)
            sys.stdout.flush()
            from admin.handlers import show_admin_main_menu
            print(f"  [DEBUG] Вызываю show_admin_main_menu...", flush=True)
            sys.stdout.flush()
            
            try:
                show_admin_main_menu(message)
                print(f"  [OK] Админ-панель показана", flush=True)
                sys.stdout.flush()
            except Exception as menu_error:
                print(f"  [ERROR] Ошибка при показе админ-меню: {menu_error}", flush=True)
                import traceback
                traceback.print_exc()
                sys.stdout.flush()
                
                # Пробуем отправить напрямую
                try:
                    from admin.handlers import get_admin_main_keyboard
                    from keyboards.admin import get_admin_main_keyboard as get_keyboard
                    bot.send_message(
                        message.chat.id,
                        "================================\n   АДМИН-ПАНЕЛЬ\n================================\n\nВыберите действие:",
                        reply_markup=get_keyboard()
                    )
                    print(f"  [OK] Админ-панель отправлена напрямую", flush=True)
                    sys.stdout.flush()
                except Exception as direct_error:
                    print(f"  [ERROR] Ошибка прямой отправки: {direct_error}", flush=True)
                    traceback.print_exc()
                    sys.stdout.flush()
                    try:
                        bot.reply_to(message, f"❌ Ошибка при открытии админ-панели: {menu_error}")
                    except:
                        pass
        else:
            print(f"  [WARNING] Неправильный код! Попытка: '{entered_code}'", flush=True)
            sys.stdout.flush()
            
            # Убираем из ожидающих после неправильной попытки
            _waiting_for_code.pop(user_id, None)
            
            bot.reply_to(
                message,
                "❌ Неправильный код доступа.\n\n"
                "Попробуйте снова, отправив команду /admin"
            )
            
    except Exception as e:
        print(f"\n[ERROR] ОШИБКА в handle_admin_code: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        # Убираем из ожидающих при ошибке
        _waiting_for_code.pop(message.from_user.id, None)
        try:
            bot.reply_to(message, f"Ошибка: {e}")
        except:
            pass
