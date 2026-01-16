"""Admin panel handlers (hidden, accessible only by whitelist)"""
from datetime import date, timedelta
from telebot import types
from bot.bot import bot
from utils.admin import is_admin
from database.archive import get_archive_by_date, get_active_users_today
from database.connection import get_supabase
from keyboards.admin import get_admin_main_keyboard, get_admin_date_keyboard


def handle_admin_access(message: types.Message):
    """Check if message is from admin and handle admin panel"""
    import sys
    user_id = message.from_user.id
    
    print(f"  [handle_admin_access] Проверка для пользователя {user_id}", flush=True)
    sys.stdout.flush()
    
    if not is_admin(user_id):
        print(f"  [handle_admin_access] Пользователь {user_id} не админ", flush=True)
        sys.stdout.flush()
        return False  # Not an admin, let other handlers process
    
    # Admin panel logic
    text = message.text
    
    if not text:
        print(f"  [handle_admin_access] Нет текста в сообщении", flush=True)
        sys.stdout.flush()
        return False
    
    print(f"  [handle_admin_access] Обрабатываю текст: '{text}'", flush=True)
    sys.stdout.flush()
    
    try:
        if text == "📊 Статистика":
            print("  [handle_admin_access] Вызываю show_statistics", flush=True)
            sys.stdout.flush()
            show_statistics(message)
        elif text == "👥 Активные сегодня":
            print("  [handle_admin_access] Вызываю show_active_users", flush=True)
            sys.stdout.flush()
            show_active_users(message)
        elif text == "📁 Архив по дате":
            print("  [handle_admin_access] Вызываю show_archive_menu", flush=True)
            sys.stdout.flush()
            show_archive_menu(message)
        elif text.startswith("📅 "):  # Date selection
            print(f"  [handle_admin_access] Выбираю дату: {text}", flush=True)
            sys.stdout.flush()
            date_str = text.replace("📅 ", "")
            try:
                archive_date = date.fromisoformat(date_str)
                show_archive_by_date(message, archive_date)
            except ValueError:
                bot.reply_to(message, "❌ Неверный формат даты")
        elif text == "🔙 Назад":
            print("  [handle_admin_access] Возврат в главное меню", flush=True)
            sys.stdout.flush()
            show_admin_main_menu(message)
        elif text == "🚪 Выйти из админ-панели":
            print("  [handle_admin_access] Выход из админ-панели", flush=True)
            sys.stdout.flush()
            exit_admin_panel(message)
        else:
            # Show admin main menu
            print(f"  [handle_admin_access] Неизвестная команда, показываю главное меню", flush=True)
            sys.stdout.flush()
            show_admin_main_menu(message)
        
        print("  [handle_admin_access] ✅ Команда обработана", flush=True)
        sys.stdout.flush()
        return True  # Admin message handled
    except Exception as e:
        print(f"  [handle_admin_access] ❌ ОШИБКА: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        return False


def show_admin_main_menu(message: types.Message):
    """Show admin main menu"""
    import sys
    try:
        print("  [show_admin_main_menu] Начало функции", flush=True)
        sys.stdout.flush()
        
        keyboard = get_admin_main_keyboard()
        print("  [show_admin_main_menu] Клавиатура создана", flush=True)
        sys.stdout.flush()
        
        menu_text = (
            "================================\n"
            "   АДМИН-ПАНЕЛЬ\n"
            "================================\n\n"
            "Выберите действие:"
        )
        
        print("  [show_admin_main_menu] Отправляю сообщение...", flush=True)
        sys.stdout.flush()
        
        # Всегда используем send_message вместо reply_to для надежности
        try:
            print("  [show_admin_main_menu] Отправляю через send_message...", flush=True)
            print(f"  [show_admin_main_menu] Chat ID: {message.chat.id}", flush=True)
            sys.stdout.flush()
            
            result = bot.send_message(
                message.chat.id,
                menu_text,
                reply_markup=keyboard
            )
            
            if result:
                print(f"  [show_admin_main_menu] ✅ Админ-меню отправлено через send_message, message_id: {result.message_id if hasattr(result, 'message_id') else 'N/A'}", flush=True)
            else:
                print(f"  [show_admin_main_menu] ⚠️ send_message вернул None!", flush=True)
            sys.stdout.flush()
        except Exception as reply_error:
            print(f"  [WARNING] Ошибка reply_to: {reply_error}, пробую send_message...", flush=True)
            import traceback
            traceback.print_exc()
            sys.stdout.flush()
            try:
                print("  [show_admin_main_menu] Вызываю bot.send_message...", flush=True)
                sys.stdout.flush()
                result = bot.send_message(
                    message.chat.id,
                    menu_text,
                    reply_markup=keyboard
                )
                print(f"  [show_admin_main_menu] ✅ Админ-меню отправлено через send_message, результат: {result}", flush=True)
                sys.stdout.flush()
            except Exception as send_error:
                print(f"  [ERROR] Ошибка send_message: {send_error}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise
    except Exception as e:
        print(f"  [show_admin_main_menu] ❌ ОШИБКА при отправке админ-меню: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()


def show_statistics(message: types.Message):
    """Show statistics"""
    import sys
    print("  [show_statistics] Начало функции", flush=True)
    sys.stdout.flush()
    
    supabase = get_supabase()
    if not supabase:
        print("  [show_statistics] ❌ База данных не подключена", flush=True)
        sys.stdout.flush()
        bot.reply_to(message, "❌ База данных не подключена")
        return
    
    try:
        print("  [show_statistics] Получаю статистику...", flush=True)
        sys.stdout.flush()
        # Get today's stats
        today = date.today().isoformat()
        today_users = supabase.table('users').select('id').eq('date_joined', today).execute()
        today_count = len(today_users.data) if today_users.data else 0
        
        # Get total users
        total_users = supabase.table('users').select('id').execute()
        total_count = len(total_users.data) if total_users.data else 0
        
        # Get total actions
        total_actions = supabase.table('user_actions').select('id').execute()
        actions_count = len(total_actions.data) if total_actions.data else 0
        
        text = (
            "╔══════════════════════════════╗\n"
            "║   📊 СТАТИСТИКА              ║\n"
            "╚══════════════════════════════╝\n\n"
            f"👥 Пользователей сегодня: {today_count}\n"
            f"📊 Всего пользователей: {total_count}\n"
            f"📝 Всего действий: {actions_count}\n"
        )
        
        print("  [show_statistics] Отправляю статистику...", flush=True)
        sys.stdout.flush()
        bot.reply_to(message, text, reply_markup=get_admin_main_keyboard())
        print("  [show_statistics] ✅ Статистика отправлена", flush=True)
        sys.stdout.flush()
    except Exception as e:
        print(f"  [show_statistics] ❌ ОШИБКА: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        bot.reply_to(message, f"❌ Ошибка: {e}")


def show_active_users(message: types.Message):
    """Show active users for today"""
    import sys
    print("  [show_active_users] Начало функции", flush=True)
    sys.stdout.flush()
    
    users = get_active_users_today()
    print(f"  [show_active_users] Получено пользователей: {len(users) if users else 0}", flush=True)
    sys.stdout.flush()
    
    if not users:
        bot.reply_to(
            message,
            "📭 Активных пользователей сегодня нет.",
            reply_markup=get_admin_main_keyboard()
        )
        return
    
    text = f"╔══════════════════════════════╗\n" \
           f"║   👥 АКТИВНЫЕ СЕГОДНЯ        ║\n" \
           f"╚══════════════════════════════╝\n\n" \
           f"Всего: {len(users)}\n\n"
    
    for i, user in enumerate(users[:20], 1):  # Limit to 20
        username = user.get('username', 'N/A')
        first_name = user.get('first_name', 'N/A')
        telegram_id = user.get('telegram_id')
        text += f"{i}. <b>{first_name}</b>\n"
        text += f"   ID: <code>{telegram_id}</code> @{username}\n\n"
    
    if len(users) > 20:
        text += f"... и еще {len(users) - 20} пользователей"
    
    bot.reply_to(message, text, reply_markup=get_admin_main_keyboard())


def show_archive_menu(message: types.Message):
    """Show archive date selection menu"""
    import sys
    print("  [show_archive_menu] Начало функции", flush=True)
    sys.stdout.flush()
    
    # Generate last 7 days
    dates = []
    for i in range(7):
        d = date.today() - timedelta(days=i)
        dates.append(d)
    
    print(f"  [show_archive_menu] Создано дат: {len(dates)}", flush=True)
    sys.stdout.flush()
    
    bot.reply_to(
        message,
        "Выберите дату для просмотра архива:",
        reply_markup=get_admin_date_keyboard(dates)
    )
    print("  [show_archive_menu] ✅ Меню отправлено", flush=True)
    sys.stdout.flush()


def show_archive_by_date(message: types.Message, archive_date: date):
    """Show archived users for specific date"""
    import sys
    users = get_archive_by_date(archive_date)
    
    if not users:
        bot.reply_to(
            message,
            f"📭 Нет архивных данных за {archive_date.isoformat()}",
            reply_markup=get_admin_main_keyboard()
        )
        return
    
    text = f"╔══════════════════════════════╗\n" \
           f"║   📁 АРХИВ                   ║\n" \
           f"╚══════════════════════════════╝\n\n" \
           f"Дата: {archive_date.isoformat()}\n" \
           f"Всего: {len(users)}\n\n"
    
    for i, user in enumerate(users[:20], 1):
        username = user.get('username', 'N/A')
        first_name = user.get('first_name', 'N/A')
        telegram_id = user.get('telegram_id')
        text += f"{i}. <b>{first_name}</b>\n"
        text += f"   ID: <code>{telegram_id}</code> @{username}\n\n"
    
    if len(users) > 20:
        text += f"... и еще {len(users) - 20} пользователей"
    
    print("  [show_archive_by_date] Отправляю архив...", flush=True)
    sys.stdout.flush()
    bot.reply_to(message, text, reply_markup=get_admin_main_keyboard())
    print("  [show_archive_by_date] ✅ Архив отправлен", flush=True)
    sys.stdout.flush()


def exit_admin_panel(message: types.Message):
    """Exit admin panel and return to main menu"""
    import sys
    from keyboards.main import get_main_keyboard
    from bot.config import WELCOME_MESSAGE
    
    try:
        print("  [exit_admin_panel] Выход из админ-панели", flush=True)
        sys.stdout.flush()
        
        keyboard = get_main_keyboard()
        
        bot.reply_to(
            message,
            "✅ Вы вышли из админ-панели.\n\n" + WELCOME_MESSAGE,
            reply_markup=keyboard
        )
        
        print("  [exit_admin_panel] ✅ Возврат в главное меню выполнен", flush=True)
        sys.stdout.flush()
    except Exception as e:
        print(f"  [exit_admin_panel] ❌ ОШИБКА: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()