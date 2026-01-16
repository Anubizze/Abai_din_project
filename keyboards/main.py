"""Main menu keyboard"""
from telebot import types


def get_main_keyboard() -> types.ReplyKeyboardMarkup:
    """Create main menu keyboard"""
    keyboard = types.ReplyKeyboardMarkup(
        row_width=1,
        resize_keyboard=True,
        one_time_keyboard=False
    )
    
    # Add menu buttons
    buttons = [
        "Дін туралы ақпарат",
        "Дін саласындағы заңнамалар",
        "Қауіп белгілері",
        "Ата-аналарға кеңес",
        "Көмек және байланыс"
    ]
    
    for button in buttons:
        keyboard.add(types.KeyboardButton(button))
    
    return keyboard
