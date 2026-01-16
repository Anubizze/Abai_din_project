"""
Main entry point for Telegram bot
"""
import sys
import io
# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

print("[1/7] Импорт основных модулей...", flush=True)
import logging
print("[2/7] Импорт bot.config...", flush=True)
from bot.config import BOT_TOKEN
print(f"[OK] Токен загружен: {BOT_TOKEN[:20]}...", flush=True)
print("[3/7] Импорт bot.bot...", flush=True)
from bot.bot import bot
print("[OK] Бот создан", flush=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Import handlers (they register themselves)
# ВАЖНО: порядок импорта определяет приоритет обработки
print("[4/7] Регистрация обработчиков...", flush=True)
print("  [4.1] Импорт handlers.start...", flush=True)
import handlers.start  # Обрабатывает /start - должен быть ПЕРВЫМ
print("  [OK] handlers.start зарегистрирован", flush=True)
print("  [4.2] Импорт handlers.admin...", flush=True)
import handlers.admin  # Обрабатывает /admin
print("  [OK] handlers.admin зарегистрирован", flush=True)
print("  [4.3] Импорт handlers.menu...", flush=True)
import handlers.menu
print("  [OK] handlers.menu зарегистрирован", flush=True)
print("  [4.4] Импорт handlers.default...", flush=True)
import handlers.default
print("  [OK] handlers.default зарегистрирован", flush=True)
print("  [4.5] Импорт admin.middleware...", flush=True)
import admin.middleware  # Обрабатывает админ-сообщения (кнопки админ-панели)
print("  [OK] admin.middleware зарегистрирован", flush=True)
print("[OK] Все обработчики зарегистрированы", flush=True)


def main():
    """Main function to start the bot"""
    print("[5/7] Бот запускается...", flush=True)
    
    try:
        print("[6/7] Очистка webhook...", flush=True)
        # Delete webhook if exists
        bot.delete_webhook(drop_pending_updates=True)
        print("[OK] Webhook очищен", flush=True)
    except Exception as e:
        print(f"[WARNING] Ошибка при очистке webhook: {e}", flush=True)
    
    try:
        print("[7/7] Проверка подключения к Telegram API...", flush=True)
        print("[INFO] Если видите ошибку 409 - остановите все процессы Python и запустите снова", flush=True)
        print("\n[DEBUG] Проверяю подключение к боту...", flush=True)
        try:
            bot_info = bot.get_me()
            print(f"[OK] Бот подключен: @{bot_info.username} ({bot_info.first_name})", flush=True)
        except Exception as e:
            print(f"[ERROR] Ошибка подключения к боту: {e}", flush=True)
            print(f"[ERROR] Детали: {type(e).__name__}: {str(e)}", flush=True)
            import traceback
            traceback.print_exc()
            return  # Не продолжаем, если не можем подключиться
        print("\n" + "="*60, flush=True)
        print("[OK] Бот запущен и ожидает сообщений...", flush=True)
        print("="*60, flush=True)
        print(f"[DEBUG] Всего зарегистрировано обработчиков: {len(bot.message_handlers)}", flush=True)
        for i, handler in enumerate(bot.message_handlers, 1):
            func_name = handler['function'].__name__
            priority = handler.get('priority', 'default')
            filters = handler.get('filters', {})
            if 'commands' in filters:
                print(f"   {i}. {func_name} - команды: {filters['commands']}, priority: {priority}", flush=True)
            else:
                print(f"   {i}. {func_name} - func filter, priority: {priority}", flush=True)
        print("\n[INFO] Отправьте /start в Telegram - должны увидеть отладочные сообщения", flush=True)
        print("[INFO] Для остановки нажмите Ctrl+C", flush=True)
        print("="*60 + "\n", flush=True)
        
        # Flush output before starting polling
        sys.stdout.flush()
        sys.stderr.flush()
        
        print("[POLLING] Запуск polling...", flush=True)
        sys.stdout.flush()
        
        # Добавляем обработчик для логирования всех обновлений
        import telebot
        original_process_new_updates = telebot.TeleBot.process_new_updates
        
        def debug_process_new_updates(self, updates):
            """DEBUG: Логируем все обновления"""
            if updates:
                print(f"\n📥 [POLLING] Получено обновлений: {len(updates)}", flush=True)
                for update in updates:
                    if update.message:
                        print(f"   Сообщение от {update.message.from_user.id if update.message.from_user else 'None'}: '{update.message.text}'", flush=True)
            sys.stdout.flush()
            return original_process_new_updates(self, updates)
        
        # Монтируем отладочную функцию (опционально, может не работать в некоторых версиях)
        # telebot.TeleBot.process_new_updates = debug_process_new_updates
        
        bot.polling(none_stop=True, interval=0, timeout=20)
    except KeyboardInterrupt:
        print("\n\n[INFO] Бот остановлен пользователем")
    except Exception as e:
        error_msg = str(e)
        if "409" in error_msg or "Conflict" in error_msg:
            print("\n" + "="*60)
            print("[ERROR] ОШИБКА 409: Запущено несколько экземпляров бота!")
            print("="*60)
            print("\n[SOLUTION] РЕШЕНИЕ:")
            print("1. Остановите ВСЕ процессы Python:")
            print("   Get-Process python | Stop-Process -Force")
            print("2. Подождите 5-10 секунд")
            print("3. Запустите бота снова:")
            print("   python main.py")
            print("\n[WARNING] Убедитесь, что НЕ запущен старый TG.py")
            print("="*60)
        else:
            print(f"[ERROR] Ошибка при запуске бота: {e}")


if __name__ == '__main__':
    main()
