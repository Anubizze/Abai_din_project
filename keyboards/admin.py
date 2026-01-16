"""Admin keyboard"""
from datetime import date
from telebot import types
from typing import List


def get_admin_main_keyboard() -> types.ReplyKeyboardMarkup:
    """Create admin main keyboard"""
    keyboard = types.ReplyKeyboardMarkup(
        row_width=1,
        resize_keyboard=True,
        one_time_keyboard=False
    )
    
    buttons = [
        "📊 Статистика",
        "👥 Активные сегодня",
        "📁 Архив по дате",
        "🚪 Выйти из админ-панели"
    ]
    
    for button in buttons:
        keyboard.add(types.KeyboardButton(button))
    
    return keyboard


def get_admin_date_keyboard(dates: List[date]) -> types.ReplyKeyboardMarkup:
    """Create date selection keyboard"""
    keyboard = types.ReplyKeyboardMarkup(
        row_width=2,
        resize_keyboard=True,
        one_time_keyboard=True
    )
    
    for d in dates:
        button_text = f"📅 {d.isoformat()}"
        keyboard.add(types.KeyboardButton(button_text))
    
    keyboard.add(types.KeyboardButton("🔙 Назад"))
    
    return keyboard
