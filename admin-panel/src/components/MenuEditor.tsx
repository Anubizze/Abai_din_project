'use client';

import { useState, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface Menu {
  id: string;
  parent_id: string | null;
  type: string;
  callback_data: string | null;
  order_index: number;
  is_active: boolean;
  texts: Text[];
}

interface Text {
  id?: string;
  lang: string;
  text: string | null;
  button_title: string | null;
  text_before_photo: string | null;
  text_after_photo: string | null;
  photo_url: string | null;
}

interface Button {
  id: string;
  text_kz: string;
  text_ru: string;
  text_en: string;
  callback_data: string;
  order_index: number;
}

interface MenuEditorProps {
  menu: Menu | null;
  onClose: () => void;
  onSave: () => void;
  allMenus?: Menu[];
}

export default function MenuEditor({ menu, onClose, onSave, allMenus = [] }: MenuEditorProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'kz' | 'ru' | 'en'>('kz');
  const [activeSection, setActiveSection] = useState<'text' | 'buttons'>('text');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [tempMenuId] = useState(() => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [photoUploadMode, setPhotoUploadMode] = useState<Record<string, 'file' | 'url'>>({
    kz: 'url',
    ru: 'url',
    en: 'url',
  });
  
  const isNewMenu = !menu;
  
  // Вычисляем начальный order_index для нового меню
  const getInitialOrderIndex = () => {
    if (menu?.order_index !== undefined) {
      return menu.order_index;
    }
    // Для нового меню: находим максимальный order_index среди корневых меню и добавляем 1
    const rootMenus = allMenus.filter(m => !m.parent_id);
    if (rootMenus.length === 0) return 0;
    return Math.max(...rootMenus.map(m => m.order_index)) + 1;
  };

  const [menuData, setMenuData] = useState({
    callback_data: menu?.callback_data || '',
    type: menu?.type || 'button',
    is_active: menu?.is_active ?? true,
    order_index: getInitialOrderIndex(),
    parent_id: menu?.parent_id || null,
  });

  // Функция для нормализации текста (убеждаемся, что все значения - строки, не null)
  const normalizeText = (text: Text | undefined, lang: string): Text => {
    if (!text) {
      return { lang, text: '', button_title: '', text_before_photo: '', text_after_photo: '', photo_url: '' };
    }
    return {
      lang: text.lang || lang,
      text: text.text || '',
      button_title: text.button_title || '',
      text_before_photo: text.text_before_photo || '',
      text_after_photo: text.text_after_photo || '',
      photo_url: text.photo_url || '',
    };
  };

  const [texts, setTexts] = useState<Record<string, Text>>({
    kz: normalizeText(menu?.texts?.find(t => t.lang === 'kz'), 'kz'),
    ru: normalizeText(menu?.texts?.find(t => t.lang === 'ru'), 'ru'),
    en: normalizeText(menu?.texts?.find(t => t.lang === 'en'), 'en'),
  });

  // Получаем дочерние кнопки (меню с parent_id = текущего меню)
  const childMenus = allMenus.filter(m => m.parent_id === menu?.id);
  const [buttons, setButtons] = useState<Button[]>(
    childMenus.map((child, index) => {
      const kzText = child.texts?.find(t => t.lang === 'kz');
      const ruText = child.texts?.find(t => t.lang === 'ru');
      const enText = child.texts?.find(t => t.lang === 'en');
      return {
        id: child.id,
        text_kz: kzText?.text || '',
        text_ru: ruText?.text || '',
        text_en: enText?.text || '',
        callback_data: child.callback_data || '',
        order_index: child.order_index,
      };
    }).sort((a, b) => a.order_index - b.order_index)
  );

  const handlePhotoUpload = async (lang: 'kz' | 'ru' | 'en', file: File) => {
    if (!file) return;

    setUploadingPhoto({ ...uploadingPhoto, [lang]: true });
    try {
      const supabase = getSupabaseClient();
      
      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const menuIdForPath = menu?.id || tempMenuId;
      const fileName = `${menuIdForPath}_${lang}_${Date.now()}.${fileExt}`;
      const filePath = `menu-photos/${fileName}`;

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bot-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Проверяем, если bucket не существует
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "bot-assets" не найден. Пожалуйста, создайте его в Supabase Dashboard: Storage → Create Bucket → bot-assets (Public: Yes). Или используйте загрузку через URL.');
        }
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('RLS') || uploadError.message.includes('violates')) {
          throw new Error('Ошибка RLS политики Storage. Решения:\n1. Настройте bucket "bot-assets" как Public в Supabase Dashboard\n2. Или используйте загрузку через URL (переключите на вкладку "URL")');
        }
        throw uploadError;
      }

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('bot-assets')
        .getPublicUrl(filePath);

      // Обновляем состояние
      setTexts({
        ...texts,
        [lang]: { ...texts[lang], photo_url: publicUrl }
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Ошибка при загрузке фотографии: ' + errorMessage + '\n\nВы можете использовать загрузку через URL вместо файла.');
    } finally {
      setUploadingPhoto({ ...uploadingPhoto, [lang]: false });
    }
  };

  const handlePhotoUrlChange = (lang: 'kz' | 'ru' | 'en', url: string) => {
    // Валидация: проверяем, что это полный URL
    let validUrl = url.trim();
    if (validUrl && !validUrl.match(/^https?:\/\//i)) {
      // Если не начинается с http:// или https://, добавляем https://
      if (validUrl.startsWith('//')) {
        validUrl = 'https:' + validUrl;
      } else if (!validUrl.startsWith('/')) {
        // Если это не относительный путь, добавляем https://
        validUrl = 'https://' + validUrl;
      } else {
        // Относительный путь - показываем предупреждение
        alert('Пожалуйста, введите полный URL (начинается с http:// или https://). Относительные пути не поддерживаются.');
        return;
      }
    }
    
    setTexts({
      ...texts,
      [lang]: { ...texts[lang] || {}, photo_url: validUrl || null }
    });
  };

  const handleFileInputChange = (lang: 'kz' | 'ru' | 'en', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }
      // Проверяем размер (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }
      handlePhotoUpload(lang, file);
    }
  };

  const addButton = () => {
    const newButton: Button = {
      id: `new_${Date.now()}`,
      text_kz: '',
      text_ru: '',
      text_en: '',
      callback_data: '',
      order_index: buttons.length > 0 ? Math.max(...buttons.map(b => b.order_index)) + 1 : 0,
    };
    setButtons([...buttons, newButton]);
  };

  const removeButton = (buttonId: string) => {
    setButtons(buttons.filter(b => b.id !== buttonId));
  };

  const updateButton = (buttonId: string, field: keyof Button, value: string | number) => {
    setButtons(buttons.map(b => 
      b.id === buttonId ? { ...b, [field]: value } : b
    ));
  };

  const moveButton = (buttonId: string, direction: 'up' | 'down') => {
    const index = buttons.findIndex(b => b.id === buttonId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= buttons.length) return;

    const newButtons = [...buttons];
    [newButtons[index], newButtons[newIndex]] = [newButtons[newIndex], newButtons[index]];
    
    // Обновляем order_index
    newButtons.forEach((btn, idx) => {
      btn.order_index = idx;
    });
    
    setButtons(newButtons);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();

      // Валидация: проверяем уникальность callback_data перед сохранением
      if (menuData.callback_data) {
        const { data: existingMenu, error: checkError } = await supabase
          .from('bot_menus')
          .select('id, callback_data')
          .eq('callback_data', menuData.callback_data)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, это нормально
          throw checkError;
        }

        if (existingMenu && (isNewMenu || existingMenu.id !== menu?.id)) {
          throw new Error(`Меню с callback_data "${menuData.callback_data}" уже существует. Пожалуйста, используйте другое значение.`);
        }
      }

      let menuId = menu?.id;

      // Создаем или обновляем меню
      if (isNewMenu) {
        // Проверяем, нужно ли сдвигать существующие меню
        const rootMenus = allMenus.filter(m => !m.parent_id);
        const menusToShift = rootMenus.filter(m => m.order_index >= menuData.order_index);
        
        // Если есть меню с таким же или большим order_index, сдвигаем их
        if (menusToShift.length > 0) {
          const shiftUpdates = menusToShift.map(m => ({
            id: m.id,
            order_index: m.order_index + 1,
          }));

          // Выполняем сдвиг в одной транзакции
          await Promise.all(
            shiftUpdates.map(update =>
              supabase
                .from('bot_menus')
                .update({ order_index: update.order_index })
                .eq('id', update.id)
            )
          );
        }

        const { data: newMenu, error: menuError } = await supabase
          .from('bot_menus')
          .insert({
            callback_data: menuData.callback_data || null,
            type: menuData.type,
            is_active: menuData.is_active,
            order_index: menuData.order_index,
            parent_id: menuData.parent_id,
          })
          .select()
          .single();

        if (menuError) {
          // Улучшенная обработка ошибок
          if (menuError.code === '23505') {
            throw new Error(`Меню с callback_data "${menuData.callback_data}" уже существует. Пожалуйста, используйте уникальное значение.`);
          }
          throw menuError;
        }
        menuId = newMenu.id;
      } else {
        // При обновлении существующего меню проверяем, изменился ли order_index
        const oldOrderIndex = menu.order_index;
        const newOrderIndex = menuData.order_index;

        if (oldOrderIndex !== newOrderIndex) {
          // Нужно пересчитать порядок всех затронутых меню
          const rootMenus = allMenus.filter(m => !m.parent_id && m.id !== menu.id);
          
          if (newOrderIndex > oldOrderIndex) {
            // Сдвигаем меню вниз: уменьшаем order_index для меню между старым и новым индексом
            const menusToShift = rootMenus.filter(
              m => m.order_index > oldOrderIndex && m.order_index <= newOrderIndex
            );
            
            await Promise.all(
              menusToShift.map(m =>
                supabase
                  .from('bot_menus')
                  .update({ order_index: m.order_index - 1 })
                  .eq('id', m.id)
              )
            );
          } else {
            // Сдвигаем меню вверх: увеличиваем order_index для меню между новым и старым индексом
            const menusToShift = rootMenus.filter(
              m => m.order_index >= newOrderIndex && m.order_index < oldOrderIndex
            );
            
            await Promise.all(
              menusToShift.map(m =>
                supabase
                  .from('bot_menus')
                  .update({ order_index: m.order_index + 1 })
                  .eq('id', m.id)
              )
            );
          }
        }

        const { error: menuError } = await supabase
          .from('bot_menus')
          .update({
            callback_data: menuData.callback_data || null,
            type: menuData.type,
            is_active: menuData.is_active,
            order_index: menuData.order_index,
            parent_id: menuData.parent_id,
          })
          .eq('id', menu.id);

        if (menuError) throw menuError;
        menuId = menu.id;
      }

      if (!menuId) throw new Error('Menu ID is missing');

      // Сохраняем тексты для каждого языка
        for (const lang of ['kz', 'ru', 'en'] as const) {
          const textData = texts[lang];
          const existingText = menu?.texts?.find(t => t.lang === lang);

          if (existingText?.id) {
            const { error: textError } = await supabase
              .from('bot_texts')
              .update({
                text: textData.text || null,
                button_title: textData.button_title || null,
                text_before_photo: textData.text_before_photo || null,
                text_after_photo: textData.text_after_photo || null,
                photo_url: textData.photo_url || null,
              })
              .eq('id', existingText.id);

            if (textError) throw textError;
          } else if (textData.text || textData.button_title || textData.text_before_photo || textData.text_after_photo || textData.photo_url) {
            const { error: textError } = await supabase
              .from('bot_texts')
              .insert({
                menu_id: menuId,
                lang,
                text: textData.text || null,
                button_title: textData.button_title || null,
                text_before_photo: textData.text_before_photo || null,
                text_after_photo: textData.text_after_photo || null,
                photo_url: textData.photo_url || null,
              });

            if (textError) throw textError;
          }
        }

      // Сохраняем кнопки (дочерние меню)
      for (const button of buttons) {
        // Валидация callback_data для кнопок (только для новых)
        if (button.id.startsWith('new_') && button.callback_data) {
          const { data: existingButton, error: checkError } = await supabase
            .from('bot_menus')
            .select('id, callback_data')
            .eq('callback_data', button.callback_data)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingButton) {
            throw new Error(`Кнопка с callback_data "${button.callback_data}" уже существует. Пожалуйста, используйте другое значение.`);
          }
        }

        if (button.id.startsWith('new_')) {
          // Создаем новое дочернее меню
          const { data: newChildMenu, error: childError } = await supabase
            .from('bot_menus')
            .insert({
              parent_id: menuId,
              type: 'button',
              callback_data: button.callback_data || null,
              order_index: button.order_index,
              is_active: true,
            })
            .select()
            .single();

          if (childError) {
            if (childError.code === '23505') {
              throw new Error(`Кнопка с callback_data "${button.callback_data}" уже существует. Пожалуйста, используйте уникальное значение.`);
            }
            throw childError;
          }

          // Создаем тексты для кнопки
          for (const lang of ['kz', 'ru', 'en'] as const) {
            const text = button[`text_${lang}` as keyof Button] as string;
            if (text) {
              const { error: textError } = await supabase
                .from('bot_texts')
                .insert({
                  menu_id: newChildMenu.id,
                  lang,
                  text: text || null,
                });

              if (textError) throw textError;
            }
          }
        } else {
          // Валидация для обновления существующих кнопок
          if (button.callback_data) {
            const { data: existingButton, error: checkError } = await supabase
              .from('bot_menus')
              .select('id, callback_data')
              .eq('callback_data', button.callback_data)
              .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
              throw checkError;
            }

            if (existingButton && existingButton.id !== button.id) {
              throw new Error(`Кнопка с callback_data "${button.callback_data}" уже существует. Пожалуйста, используйте другое значение.`);
            }
          }

          // Обновляем существующее дочернее меню
          const { error: childError } = await supabase
            .from('bot_menus')
            .update({
              callback_data: button.callback_data || null,
              order_index: button.order_index,
            })
            .eq('id', button.id);

          if (childError) {
            if (childError.code === '23505') {
              throw new Error(`Кнопка с callback_data "${button.callback_data}" уже существует. Пожалуйста, используйте уникальное значение.`);
            }
            throw childError;
          }

          // Обновляем тексты кнопки
          for (const lang of ['kz', 'ru', 'en'] as const) {
            const text = button[`text_${lang}` as keyof Button] as string;
            const existingButtonText = allMenus
              .find(m => m.id === button.id)
              ?.texts?.find(t => t.lang === lang);

            if (existingButtonText?.id) {
              const { error: textError } = await supabase
                .from('bot_texts')
                .update({
                  text: text || null,
                })
                .eq('id', existingButtonText.id);

              if (textError) throw textError;
            } else if (text) {
              const { error: textError } = await supabase
                .from('bot_texts')
                .insert({
                  menu_id: button.id,
                  lang,
                  text: text || null,
                });

              if (textError) throw textError;
            }
          }
        }
      }

      // Удаляем кнопки, которые были удалены
      const existingButtonIds = buttons.map(b => b.id).filter(id => !id.startsWith('new_'));
      const buttonsToDelete = childMenus
        .map(c => c.id)
        .filter(id => !existingButtonIds.includes(id));

      for (const buttonId of buttonsToDelete) {
        // Удаление произойдет автоматически через CASCADE
        const { error: deleteError } = await supabase
          .from('bot_menus')
          .delete()
          .eq('id', buttonId);

        if (deleteError) throw deleteError;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving menu:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Более понятные сообщения об ошибках
      let userMessage = errorMessage;
      if (errorMessage.includes('duplicate key') || errorMessage.includes('23505')) {
        userMessage = `Ошибка: Меню с таким callback_data уже существует.\n\nПожалуйста, используйте уникальное значение для "Callback Data".\n\nТекущее значение: "${menuData.callback_data}"`;
      } else if (errorMessage.includes('callback_data')) {
        userMessage = errorMessage;
      }
      
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!menu && !isNewMenu) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl w-full mx-2 sm:mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {isNewMenu ? 'Создание нового меню' : 'Редактирование меню'}
              </h3>
              {!isNewMenu && (
                <p className="text-sm text-slate-500 mt-0.5">ID: {menu.id.substring(0, 8)}...</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          className="overflow-y-auto p-3 sm:p-6"
          style={{ 
            maxHeight: 'calc(90vh - 140px)',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Menu Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Настройки меню</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Callback Data <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={menuData.callback_data}
                    onChange={(e) => setMenuData({ ...menuData, callback_data: e.target.value })}
                    className="input font-mono text-xs flex-1"
                    placeholder="menu_example"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // Автогенерация на основе названия кнопки (KZ)
                      const kzTitle = texts.kz.button_title?.trim() || texts.kz.text?.split('\n')[0]?.trim() || '';
                      if (kzTitle) {
                        const generated = 'menu_' + kzTitle
                          .toLowerCase()
                          .replace(/[^a-zа-я0-9]/g, '_')
                          .replace(/_+/g, '_')
                          .replace(/^_|_$/g, '')
                          .substring(0, 50);
                        setMenuData({ ...menuData, callback_data: generated });
                      }
                    }}
                    className="btn btn-secondary btn-sm whitespace-nowrap"
                    title="Сгенерировать из названия кнопки"
                  >
                    Авто
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Уникальный идентификатор для обработки нажатий в боте. Можно сгенерировать автоматически из названия кнопки.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Порядок
                </label>
                <input
                  type="number"
                  value={menuData.order_index}
                  onChange={(e) => setMenuData({ ...menuData, order_index: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={menuData.is_active}
                    onChange={(e) => setMenuData({ ...menuData, is_active: e.target.checked })}
                    className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Активно</span>
                </label>
              </div>
              {/* Скрытое поле типа - всегда button для упрощения */}
              <input type="hidden" value={menuData.type} />
            </div>
          </div>

          {/* Section Tabs */}
          <div className="mb-4 sm:mb-6">
            <div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto">
              <button
                onClick={() => setActiveSection('text')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-subtle whitespace-nowrap ${
                  activeSection === 'text'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Текст и фото
              </button>
              <button
                onClick={() => setActiveSection('buttons')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-subtle whitespace-nowrap ${
                  activeSection === 'buttons'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Кнопки ({buttons.length})
              </button>
            </div>
          </div>

          {/* Text Section */}
          {activeSection === 'text' && (
            <>
              {/* Language Tabs */}
              <div className="mb-4 sm:mb-6">
                <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
                  {(['kz', 'ru', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-subtle whitespace-nowrap flex-1 sm:flex-none ${
                        activeTab === lang
                          ? 'border-slate-900 text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {lang.toUpperCase()}
                      {texts[lang].text && (
                        <span className="ml-1 text-xs text-slate-400">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Editor */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Название кнопки <span className="text-slate-400 text-xs">(отображается на кнопке в боте)</span>
                  </label>
                  <input
                    type="text"
                    value={texts[activeTab]?.button_title || ''}
                    onChange={(e) => setTexts({
                      ...texts,
                      [activeTab]: { ...texts[activeTab] || {}, button_title: e.target.value }
                    })}
                    className="input text-sm w-full"
                    placeholder="Короткое название для кнопки..."
                    maxLength={50}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Это название будет отображаться на кнопке в Telegram боте
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Основной текст <span className="text-slate-400 text-xs">(отображается при нажатии на кнопку)</span>
                  </label>
                  <textarea
                    value={texts[activeTab]?.text || ''}
                    onChange={(e) => setTexts({
                      ...texts,
                      [activeTab]: { ...texts[activeTab] || {}, text: e.target.value }
                    })}
                    rows={12}
                    className="textarea text-sm w-full"
                    placeholder="Введите текст, который будет показан при нажатии на кнопку..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Текст под изображением
                  </label>
                  <textarea
                    value={texts[activeTab]?.text_before_photo || ''}
                    onChange={(e) => setTexts({
                      ...texts,
                      [activeTab]: { ...texts[activeTab] || {}, text_before_photo: e.target.value }
                    })}
                    rows={3}
                    className="textarea text-sm w-full"
                    placeholder="Текст под изображением (используется как подпись к фото)..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Этот текст будет отображаться как подпись к фотографии
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Фотографии <span className="text-slate-400 text-xs">(отдельно для каждого языка)</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Для KZ/RU/EN можно загрузить разные изображения. Это полезно, если на картинке есть текст на конкретном языке.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['kz', 'ru', 'en'] as const).map((lang) => (
                      <div key={lang} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-slate-900">
                            {lang.toUpperCase()}
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setPhotoUploadMode({ ...photoUploadMode, [lang]: 'url' })}
                              className={`btn btn-xs ${photoUploadMode[lang] === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                              URL
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotoUploadMode({ ...photoUploadMode, [lang]: 'file' })}
                              className={`btn btn-xs ${photoUploadMode[lang] === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                              Файл
                            </button>
                          </div>
                        </div>

                        {photoUploadMode[lang] === 'url' ? (
                          <div className="space-y-2">
                            <input
                              type="url"
                              value={texts[lang]?.photo_url || ''}
                              onChange={(e) => handlePhotoUrlChange(lang, e.target.value)}
                              className="input text-xs w-full"
                              placeholder="https://..."
                            />
                            <p className="text-[11px] text-slate-500">
                              Полный URL (http/https)
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              ref={(el: HTMLInputElement | null) => { 
                                fileInputRefs.current[lang] = el; 
                              }}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileInputChange(lang, e)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[lang]?.click()}
                              disabled={!!uploadingPhoto[lang]}
                              className="btn btn-secondary btn-xs"
                            >
                              {uploadingPhoto[lang] ? 'Загрузка...' : 'Выбрать файл'}
                            </button>
                            <p className="text-[11px] text-slate-500">
                              До 5MB, загрузка в Storage
                            </p>
                          </div>
                        )}

                        {texts[lang]?.photo_url ? (
                          <div className="mt-3 space-y-2">
                            <div className="border border-slate-200 rounded p-2 bg-white">
                              <img
                                src={texts[lang]?.photo_url || ''}
                                alt="Preview"
                                className="max-w-full h-auto max-h-32 rounded mx-auto"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <p className="text-[11px] text-slate-500 mt-2 break-all">
                                {texts[lang]?.photo_url}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTexts({
                                ...texts,
                                [lang]: { ...texts[lang] || {}, photo_url: null }
                              })}
                              className="btn btn-ghost btn-xs"
                            >
                              Удалить
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 text-[11px] text-slate-400">
                            Фото не задано
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Текст после фото
                  </label>
                  <textarea
                    value={texts[activeTab]?.text_after_photo || ''}
                    onChange={(e) => setTexts({
                      ...texts,
                      [activeTab]: { ...texts[activeTab] || {}, text_after_photo: e.target.value }
                    })}
                    rows={3}
                    className="textarea text-sm w-full"
                    placeholder="Текст после фото..."
                  />
                </div>
              </div>
            </>
          )}

          {/* Buttons Section */}
          {activeSection === 'buttons' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-900">Управление кнопками</h4>
                <button
                  onClick={addButton}
                  className="btn btn-primary btn-sm"
                >
                  + Добавить кнопку
                </button>
              </div>

              {buttons.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Кнопки не добавлены. Нажмите "Добавить кнопку" чтобы создать новую.
                </div>
              ) : (
                <div className="space-y-3">
                  {buttons.map((button, index) => (
                    <div key={button.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">#{index + 1}</span>
                          <button
                            onClick={() => moveButton(button.id, 'up')}
                            disabled={index === 0}
                            className="btn btn-ghost btn-xs disabled:opacity-30"
                            title="Вверх"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveButton(button.id, 'down')}
                            disabled={index === buttons.length - 1}
                            className="btn btn-ghost btn-xs disabled:opacity-30"
                            title="Вниз"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          onClick={() => removeButton(button.id)}
                          className="btn btn-ghost btn-xs text-red-600"
                        >
                          Удалить
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Текст (KZ)
                          </label>
                          <input
                            type="text"
                            value={button.text_kz}
                            onChange={(e) => updateButton(button.id, 'text_kz', e.target.value)}
                            className="input text-xs w-full"
                            placeholder="Текст кнопки на казахском"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Текст (RU)
                          </label>
                          <input
                            type="text"
                            value={button.text_ru}
                            onChange={(e) => updateButton(button.id, 'text_ru', e.target.value)}
                            className="input text-xs w-full"
                            placeholder="Текст кнопки на русском"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Текст (EN)
                          </label>
                          <input
                            type="text"
                            value={button.text_en}
                            onChange={(e) => updateButton(button.id, 'text_en', e.target.value)}
                            className="input text-xs w-full"
                            placeholder="Текст кнопки на английском"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Callback Data
                          </label>
                          <input
                            type="text"
                            value={button.callback_data}
                            onChange={(e) => updateButton(button.id, 'callback_data', e.target.value)}
                            className="input font-mono text-xs w-full"
                            placeholder="button_callback"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-3 sm:px-6 py-3 sm:py-4 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <button onClick={onClose} disabled={loading} className="btn btn-secondary order-2 sm:order-1">
            Отмена
          </button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary order-1 sm:order-2">
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
