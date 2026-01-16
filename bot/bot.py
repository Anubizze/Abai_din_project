"""Main bot instance"""
import telebot
from bot.config import BOT_TOKEN

# Create bot instance
bot = telebot.TeleBot(BOT_TOKEN, parse_mode='HTML')
