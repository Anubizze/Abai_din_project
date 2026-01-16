"""Configuration settings for the bot"""
import os
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token
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

# Admin whitelist (telegram user IDs)
# ВАЖНО: Чтобы узнать свой ID, напишите боту @userinfobot или @getmyid_bot
# На скриншоте видно, что пользователь "Adil" имеет ID 1376152274 (из UserIdBot)
ADMIN_IDS: List[int] = [
    1376151274,  # Adil 
    # Добавьте сюда другие ID админов через запятую
]

# Секретный код для входа в админ-панель
ADMIN_SECRET_CODE = os.getenv("ADMIN_SECRET_CODE", "Admin04394")  

# Bot welcome message
WELCOME_MESSAGE = (
    "Қош келдіңіз!\n"
    "Бұл «Абай облысы Дін мәселелерін зерттеу орталығы» КММ\n\n"
    "Егер дін саласындағы сұрақтар мен мәселелеріңіз болса, "
    "төмендегі кнопкаларды пайдаланыңыз."
)
