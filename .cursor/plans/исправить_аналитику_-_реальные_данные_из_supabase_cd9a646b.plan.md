---
name: Исправить аналитику - реальные данные из Supabase
overview: Исправить несоответствия в запросах к представлениям аналитики, чтобы все данные корректно загружались из Supabase и отображались на графиках. Улучшить форматирование дат и обработку пустых данных для более интуитивного отображения.
todos: []
---

# Исправление аналитики - подключение реальных данных из Supabase

## Проблемы

1. **Несоответствие полей**: В представлении `user_daily_activity` поле называется `total_actions`, но в запросе используется `actions_count`
2. **Форматирование дат**: Даты на графиках отображаются в формате ISO, нужно сделать их более читаемыми
3. **Обработка пустых данных**: Нужно улучшить отображение, когда данных нет или мало

## Решение

### 1. Исправить запрос к `user_daily_activity`

В файле [admin-panel/src/app/admin/analytics/summary/page.tsx](admin-panel/src/app/admin/analytics/summary/page.tsx):

- Изменить запрос с `actions_count` на `total_actions` (строка 118)
- Обновить интерфейс `SummaryStats` и состояние для использования `total_actions`

### 2. Улучшить форматирование дат в графиках

В компонентах графиков:

- [admin-panel/src/components/analytics/ActivityChart.tsx](admin-panel/src/components/analytics/ActivityChart.tsx) - добавить форматирование дат на оси X
- [admin-panel/src/components/analytics/GrowthChart.tsx](admin-panel/src/components/analytics/GrowthChart.tsx) - добавить форматирование дат на оси X

### 3. Улучшить обработку данных

- Добавить преобразование данных перед передачей в графики
- Обеспечить корректное отображение дат в формате DD.MM или DD.MM.YYYY
- Добавить проверку на пустые данные с более понятными сообщениями

### 4. Проверить соответствие всех представлений

Убедиться, что все запросы соответствуют структуре представлений из [supabase/migrations/021_analytics_views.sql](supabase/migrations/021_analytics_views.sql):

- `user_daily_activity` - использует `total_actions` (не `actions_count`)
- `hourly_activity_summary` - использует `actions_count` ✓
- `user_growth_daily` - использует `total_users` ✓

## Файлы для изменения

1. `admin-panel/src/app/admin/analytics/summary/page.tsx` - исправить запрос и обработку данных
2. `admin-panel/src/components/analytics/ActivityChart.tsx` - улучшить форматирование дат
3. `admin-panel/src/components/analytics/GrowthChart.tsx` - улучшить форматирование дат

## Результат

После исправлений:

- Все данные будут корректно загружаться из Supabase
- Графики будут отображать реальные данные с правильным форматированием дат
- Пустые данные будут обрабатываться корректно с понятными сообщениями