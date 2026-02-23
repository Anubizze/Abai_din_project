-- ============================================
-- ADD BUTTON TITLE FIELD
-- ============================================
-- Добавляем отдельное поле для названия кнопки
-- Это позволит задавать короткое название для кнопки отдельно от основного текста

ALTER TABLE bot_texts 
ADD COLUMN IF NOT EXISTS button_title TEXT;

-- Добавляем комментарий
COMMENT ON COLUMN bot_texts.button_title IS 'Короткое название кнопки для отображения в интерфейсе бота (отдельно от основного текста)';

-- Обновляем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_bot_texts_button_title ON bot_texts(button_title) WHERE button_title IS NOT NULL;
