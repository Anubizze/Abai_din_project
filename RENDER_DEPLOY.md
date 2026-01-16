# 🚀 Деплой на Render.com

Инструкция по развертыванию Telegram бота на Render.com

## 📋 Предварительные требования

1. Аккаунт на [Render.com](https://render.com)
2. GitHub репозиторий с вашим проектом (или подключите через Git)
3. Токен Telegram бота
4. Данные Supabase (URL и ключ)

## 🔧 Шаг 1: Подготовка проекта

Проект уже содержит необходимые файлы:
- `render.yaml` - конфигурация для Render
- `Procfile` - альтернативный способ запуска
- `requirements.txt` - зависимости Python

## 📝 Шаг 2: Создание сервиса на Render

### Вариант A: Использование render.yaml (Рекомендуется)

1. Войдите в [Render Dashboard](https://dashboard.render.com)
2. Нажмите **"New +"** → **"Blueprint"**
3. Подключите ваш GitHub репозиторий
4. Render автоматически обнаружит `render.yaml` и создаст сервис

### Вариант B: Ручное создание Worker

1. Войдите в [Render Dashboard](https://dashboard.render.com)
2. Нажмите **"New +"** → **"Background Worker"**
3. Подключите ваш GitHub репозиторий
4. Настройте:
   - **Name**: `abai-din-bot` (или любое другое имя)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Plan**: Выберите подходящий план (Free tier доступен)

## 🔐 Шаг 3: Настройка переменных окружения

В настройках вашего сервиса (Settings → Environment Variables) добавьте:

```
TELEGRAM_BOT_TOKEN=ваш_токен_бота
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_KEY=ваш_ключ_supabase
ADMIN_SECRET_CODE=ваш_секретный_код
PYTHONUNBUFFERED=1
```

### Как получить токен бота:
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` или `/mybots` для существующего бота
3. Скопируйте токен

### Как получить данные Supabase:
1. Войдите в ваш проект на [supabase.com](https://supabase.com)
2. Перейдите в Settings → API
3. Скопируйте:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`

## 🚀 Шаг 4: Деплой

1. После настройки переменных окружения нажмите **"Manual Deploy"** → **"Deploy latest commit"**
2. Дождитесь завершения деплоя (обычно 2-5 минут)
3. Проверьте логи в разделе **"Logs"**

## ✅ Шаг 5: Проверка работы

1. Откройте раздел **"Logs"** в Render Dashboard
2. Вы должны увидеть сообщения:
   ```
   [OK] Бот подключен: @your_bot_username
   [OK] Бот запущен и ожидает сообщений...
   ```
3. Отправьте `/start` вашему боту в Telegram
4. Бот должен ответить

## 🔍 Мониторинг и логи

- **Логи**: Render Dashboard → Ваш сервис → Logs
- **Метрики**: Render Dashboard → Ваш сервис → Metrics
- **События**: Render Dashboard → Ваш сервис → Events

## ⚠️ Важные замечания

1. **Free Tier ограничения**:
   - Сервис "засыпает" после 15 минут неактивности
   - Первый запрос после пробуждения может занять 30-60 секунд
   - Для production рекомендуется платный план

2. **Webhook vs Polling**:
   - Текущая версия использует polling (постоянное подключение)
   - Для production можно перейти на webhook (быстрее и эффективнее)

3. **Переменные окружения**:
   - Никогда не коммитьте `.env` файл в Git
   - Все секретные данные храните только в Render Environment Variables

4. **Обновление бота**:
   - Push в GitHub автоматически запускает новый деплой
   - Или используйте "Manual Deploy" в Render Dashboard

## 🐛 Решение проблем

### Бот не отвечает
- Проверьте логи в Render Dashboard
- Убедитесь, что все переменные окружения установлены
- Проверьте токен бота

### Ошибка подключения к Supabase
- Проверьте `SUPABASE_URL` и `SUPABASE_KEY`
- Убедитесь, что Supabase проект активен

### Сервис не запускается
- Проверьте логи на ошибки импорта
- Убедитесь, что все зависимости в `requirements.txt`
- Проверьте версию Python (должна быть 3.11+)

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в Render Dashboard
2. Убедитесь, что все переменные окружения установлены
3. Проверьте документацию Render: https://render.com/docs

