"""Configuration settings for the bot"""
import os
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token
<<<<<<< HEAD
# ВАЖНО: Используйте переменную окружения TELEGRAM_BOT_TOKEN
# Для локальной разработки создайте .env файл (см. env.example)
# Для Render.com добавьте переменную в настройках сервиса
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError(
        "❌ ОШИБКА: TELEGRAM_BOT_TOKEN не установлен!\n"
        "Создайте файл .env или установите переменную окружения TELEGRAM_BOT_TOKEN"
    )

# Supabase settings
# ВАЖНО: Используйте переменные окружения SUPABASE_URL и SUPABASE_KEY
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️ ВНИМАНИЕ: Supabase не настроен. Установите SUPABASE_URL и SUPABASE_KEY")
=======
# ВАЖНО: Используется старый токен. Если нужно использовать .env, закомментируйте следующую строку
BOT_TOKEN = "8295848990:AAHxFkbErVLoomRHKP3PsZuafjUMhRaFazU"
# BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8295848990:AAHxFkbErVLoomRHKP3PsZuafjUMhRaFazU")

# Supabase settings
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lnlcnwiswteoaqdyddqm.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubGNud2lzd3Rlb2FxZHlkZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDY1MjksImV4cCI6MjA4MzgyMjUyOX0.Dc-L5doOkusu5jMc26TMqRC63yHsQ2VOMyr18vxH9P4")
>>>>>>> 4373336f92f3ef26cf663cabf08ef2460d0e7350

# Admin whitelist (telegram user IDs)
# ВАЖНО: Чтобы узнать свой ID, напишите боту @userinfobot или @getmyid_bot
# На скриншоте видно, что пользователь "Adil" имеет ID 1376152274 (из UserIdBot)
ADMIN_IDS: List[int] = [
    1376151274,  # Adil 
    # Добавьте сюда другие ID админов через запятую
]

# Секретный код для входа в админ-панель
<<<<<<< HEAD
ADMIN_SECRET_CODE = os.getenv("ADMIN_SECRET_CODE", "Admin04394")  
=======
ADMIN_SECRET_CODE = "Admin04394"  
>>>>>>> 4373336f92f3ef26cf663cabf08ef2460d0e7350

# Bot welcome message
WELCOME_MESSAGE = (
    "Қош келдіңіз!\n"
    "Бұл «Абай облысы Дін мәселелерін зерттеу орталығы» КММ\n\n"
    "Егер дін саласындағы сұрақтар мен мәселелеріңіз болса, "
    "төмендегі кнопкаларды пайдаланыңыз."
)
