"""Configuration settings for the bot"""
import os
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token
# ВАЖНО: Используется старый токен. Если нужно использовать .env, закомментируйте следующую строку
BOT_TOKEN = "8295848990:AAHxFkbErVLoomRHKP3PsZuafjUMhRaFazU"
# BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8295848990:AAHxFkbErVLoomRHKP3PsZuafjUMhRaFazU")

# Supabase settings
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lnlcnwiswteoaqdyddqm.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubGNud2lzd3Rlb2FxZHlkZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDY1MjksImV4cCI6MjA4MzgyMjUyOX0.Dc-L5doOkusu5jMc26TMqRC63yHsQ2VOMyr18vxH9P4")

# Admin whitelist (telegram user IDs)
# ВАЖНО: Чтобы узнать свой ID, напишите боту @userinfobot или @getmyid_bot
# На скриншоте видно, что пользователь "Adil" имеет ID 1376152274 (из UserIdBot)
ADMIN_IDS: List[int] = [
    1376151274,  # Adil 
    # Добавьте сюда другие ID админов через запятую
]

# Секретный код для входа в админ-панель
ADMIN_SECRET_CODE = "Admin04394"  

# Bot welcome message
WELCOME_MESSAGE = (
    "Қош келдіңіз!\n"
    "Бұл «Абай облысы Дін мәселелерін зерттеу орталығы» КММ\n\n"
    "Егер дін саласындағы сұрақтар мен мәселелеріңіз болса, "
    "төмендегі кнопкаларды пайдаланыңыз."
)
