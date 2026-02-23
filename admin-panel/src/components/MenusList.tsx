'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { getSupabaseClient } from '@/lib/supabase';
import MenuEditor from './MenuEditor';

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
  id: string;
  lang: string;
  text: string | null;
  button_title: string | null;
  text_before_photo: string | null;
  text_after_photo: string | null;
  photo_url: string | null;
}

export default function MenusList() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('bot_menus')
        .select(`
          *,
          texts:bot_texts(*)
        `)
        .order('order_index');

      if (error) throw error;
      setMenus(data || []);
    } catch (error) {
      console.error('Error loading menus:', error);
      alert('Ошибка при загрузке меню: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (menuId: string, currentStatus: boolean) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bot_menus')
        .update({ is_active: !currentStatus })
        .eq('id', menuId);

      if (error) throw error;
      
      setMenus(menus.map(m => 
        m.id === menuId ? { ...m, is_active: !currentStatus } : m
      ));
    } catch (error) {
      console.error('Error toggling menu:', error);
      alert('Ошибка при изменении статуса');
    }
  };

  /**
   * Пересчитывает order_index для всех корневых меню
   * Используется после drag & drop или изменения порядка
   */
  const reorderMenus = async (newOrder: Menu[]) => {
    try {
      const supabase = getSupabaseClient();
      
      // Подготавливаем обновления для всех меню
      const updates = newOrder.map((menu, index) => ({
        id: menu.id,
        order_index: index,
      }));

      // Выполняем все обновления в одной транзакции (через Promise.all)
      await Promise.all(
        updates.map(update =>
          supabase
            .from('bot_menus')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        )
      );

      // Обновляем локальное состояние
      setMenus(menus.map(m => {
        const updated = updates.find(u => u.id === m.id);
        return updated ? { ...m, order_index: updated.order_index } : m;
      }));
    } catch (error) {
      console.error('Error reordering menus:', error);
      alert('Ошибка при изменении порядка');
      loadMenus(); // Перезагружаем в случае ошибки
    }
  };

  /**
   * Обработчик drag & drop
   */
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const rootMenus = menus.filter(m => !m.parent_id).sort((a, b) => a.order_index - b.order_index);
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Создаем новый порядок
    const newOrder = Array.from(rootMenus);
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(destinationIndex, 0, removed);

    // Обновляем порядок в БД
    await reorderMenus(newOrder);
  };

  const updateOrder = async (menuId: string, direction: 'up' | 'down') => {
    try {
      const rootMenus = menus.filter(m => !m.parent_id).sort((a, b) => a.order_index - b.order_index);
      const currentIndex = rootMenus.findIndex(m => m.id === menuId);
      
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= rootMenus.length) return;

      // Создаем новый порядок
      const newOrder = Array.from(rootMenus);
      const [removed] = newOrder.splice(currentIndex, 1);
      newOrder.splice(newIndex, 0, removed);

      // Обновляем порядок в БД
      await reorderMenus(newOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Ошибка при изменении порядка');
    }
  };

  const deleteMenu = async (menuId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это меню? Все дочерние элементы также будут удалены.')) {
      return;
    }

    try {
      const menu = menus.find(m => m.id === menuId);
      if (!menu) return;

      const supabase = getSupabaseClient();
      
      // Удаляем меню
      const { error } = await supabase
        .from('bot_menus')
        .delete()
        .eq('id', menuId);

      if (error) throw error;

      // Пересчитываем order_index для оставшихся корневых меню
      const rootMenus = menus
        .filter(m => !m.parent_id && m.id !== menuId)
        .sort((a, b) => a.order_index - b.order_index);

      // Обновляем order_index для всех оставшихся меню
      const updates = rootMenus.map((m, index) => ({
        id: m.id,
        order_index: index,
      }));

      await Promise.all(
        updates.map(update =>
          supabase
            .from('bot_menus')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        )
      );
      
      loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('Ошибка при удалении меню');
    }
  };

  const getMenuTitle = (menu: Menu) => {
    const kzText = menu.texts?.find(t => t.lang === 'kz');
    return kzText?.button_title || kzText?.text?.substring(0, 50) || menu.callback_data || menu.id;
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setEditingMenu(null);
  };

  const handleEdit = (menu: Menu) => {
    setIsCreatingNew(false);
    setEditingMenu(menu);
  };

  const handleCloseEditor = () => {
    setIsCreatingNew(false);
    setEditingMenu(null);
  };

  // Фильтруем только корневые меню для отображения
  const rootMenus = menus.filter(m => !m.parent_id).sort((a, b) => a.order_index - b.order_index);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div 
      className="animate-fade-in"
      style={{ 
        overflowX: 'visible',
        overflowY: 'visible',
        width: '100%'
      }}
    >
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Меню бота</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {rootMenus.length} {rootMenus.length === 1 ? 'элемент' : 'элементов'}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="btn btn-primary w-full sm:w-auto"
          >
            + Добавить меню
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      {/* Видно только на экранах >= 768px (desktop) */}
      <div className="hidden md:block card overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <table className="table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Название</th>
                <th className="w-24">Тип</th>
                <th className="w-24">Статус</th>
                <th className="w-32">Языки</th>
                <th className="w-32">Кнопки</th>
                <th className="w-28 text-right">Действия</th>
              </tr>
            </thead>
            <Droppable droppableId="menus-desktop">
              {(provided) => (
                <tbody {...provided.droppableProps} ref={provided.innerRef}>
                  {rootMenus.map((menu, index) => {
                    const title = getMenuTitle(menu);
                    const hasKz = menu.texts?.some(t => t.lang === 'kz' && t.text);
                    const hasRu = menu.texts?.some(t => t.lang === 'ru' && t.text);
                    const hasEn = menu.texts?.some(t => t.lang === 'en' && t.text);
                    
                    // Считаем количество дочерних кнопок
                    const childButtons = menus.filter(m => m.parent_id === menu.id);
                    
                    return (
                      <Draggable key={menu.id} draggableId={menu.id} index={index}>
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'bg-slate-100' : ''}
                          >
                            <td className="text-slate-500 font-mono text-xs" {...provided.dragHandleProps}>
                              <div className="flex items-center gap-1">
                                <span className="cursor-move">⋮⋮</span>
                                <span>{menu.order_index}</span>
                              </div>
                            </td>
                            <td>
                              <div className="font-medium text-slate-900">{title}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                {menu.callback_data || menu.id}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-neutral">{menu.type}</span>
                            </td>
                            <td>
                              {menu.is_active ? (
                                <span className="badge badge-success">Активно</span>
                              ) : (
                                <span className="badge badge-error">Неактивно</span>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs ${hasKz ? 'text-slate-900' : 'text-slate-300'}`}>KZ</span>
                                <span className={`text-xs ${hasRu ? 'text-slate-900' : 'text-slate-300'}`}>RU</span>
                                <span className={`text-xs ${hasEn ? 'text-slate-900' : 'text-slate-300'}`}>EN</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-xs text-slate-600">
                                {childButtons.length} {childButtons.length === 1 ? 'кнопка' : 'кнопок'}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => updateOrder(menu.id, 'up')}
                                  disabled={index === 0}
                                  className="btn btn-ghost btn-sm disabled:opacity-30 px-1.5 py-1 min-w-[32px]"
                                  title="Переместить вверх"
                                >
                                  ⬆️
                                </button>
                                <button
                                  onClick={() => updateOrder(menu.id, 'down')}
                                  disabled={index >= rootMenus.length - 1}
                                  className="btn btn-ghost btn-sm disabled:opacity-30 px-1.5 py-1 min-w-[32px]"
                                  title="Переместить вниз"
                                >
                                  ⬇️
                                </button>
                                <button
                                  onClick={() => toggleActive(menu.id, menu.is_active)}
                                  className="btn btn-ghost btn-sm px-1.5 py-1 min-w-[32px]"
                                  title={menu.is_active ? 'Деактивировать меню' : 'Активировать меню'}
                                >
                                  {menu.is_active ? '⏸' : '▶'}
                                </button>
                                <button
                                  onClick={() => handleEdit(menu)}
                                  className="btn btn-primary btn-sm px-2 py-1 min-w-[36px]"
                                  title="Редактировать меню"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteMenu(menu.id)}
                                  className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 px-1.5 py-1 min-w-[32px]"
                                  title="Удалить меню"
                                >
                                  🗑
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
              )}
            </Droppable>
          </table>
        </DragDropContext>
      </div>

      {/* Mobile Card View - Полностью переделанная версия */}
      {/* Видно только на экранах < 768px (мобильные устройства) */}
      <div className="block md:hidden" style={{ width: '100%', maxWidth: '100%' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="menus-mobile">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="space-y-4 pb-4"
                style={{ overflowY: 'visible' }}
              >
                {rootMenus.map((menu, index) => {
                  const title = getMenuTitle(menu);
                  const hasKz = menu.texts?.some(t => t.lang === 'kz' && t.text);
                  const hasRu = menu.texts?.some(t => t.lang === 'ru' && t.text);
                  const hasEn = menu.texts?.some(t => t.lang === 'en' && t.text);
                  
                  // Считаем количество дочерних кнопок
                  const childButtons = menus.filter(m => m.parent_id === menu.id);
                  
                  return (
                    <Draggable key={menu.id} draggableId={menu.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`card ${snapshot.isDragging ? 'bg-slate-100 shadow-lg' : ''}`}
                          style={{ 
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Верхняя часть карточки - заголовок и drag handle */}
                          <div className="p-4 pb-3 border-b border-slate-200">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-mono text-slate-500 font-semibold">#{menu.order_index}</span>
                                  {menu.is_active ? (
                                    <span className="badge badge-success text-xs">Активно</span>
                                  ) : (
                                    <span className="badge badge-error text-xs">Неактивно</span>
                                  )}
                                </div>
                                <div className="font-semibold text-slate-900 text-base mb-1.5 break-words">
                                  {title}
                                </div>
                                <div className="text-xs text-slate-500 font-mono break-all">
                                  {menu.callback_data || menu.id}
                                </div>
                              </div>
                              <div {...provided.dragHandleProps} className="flex-shrink-0 pt-1">
                                <span className="text-slate-400 text-xl cursor-move select-none">⋮⋮</span>
                              </div>
                            </div>
                          </div>

                          {/* Средняя часть - информация */}
                          <div className="px-4 py-3 border-b border-slate-200">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600 font-medium">Языки:</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold ${hasKz ? 'text-slate-900' : 'text-slate-300'}`}>KZ</span>
                                  <span className={`text-sm font-semibold ${hasRu ? 'text-slate-900' : 'text-slate-300'}`}>RU</span>
                                  <span className={`text-sm font-semibold ${hasEn ? 'text-slate-900' : 'text-slate-300'}`}>EN</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600 font-medium">Кнопки:</span>
                                <span className="text-sm text-slate-900 font-medium">
                                  {childButtons.length} {childButtons.length === 1 ? 'кнопка' : 'кнопок'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Нижняя часть - действия (ВСЕГДА ВИДИМА) */}
                          <div 
                            className="p-4 pt-3 flex flex-col gap-2"
                            style={{ 
                              position: 'relative',
                              zIndex: 1,
                              marginTop: 'auto'
                            }}
                          >
                            {/* Основная кнопка редактирования - ВСЕГДА ВИДИМА */}
                            <button
                              onClick={() => handleEdit(menu)}
                              className="btn btn-primary w-full py-3.5 text-base font-semibold"
                              style={{ 
                                zIndex: 10,
                                position: 'relative',
                                minHeight: '44px', // Минимальная высота для touch-целей
                                touchAction: 'manipulation'
                              }}
                            >
                              ✏ Редактировать
                            </button>
                            
                            {/* Дополнительные действия в одну строку */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateOrder(menu.id, 'up')}
                                  disabled={index === 0}
                                  className="btn btn-secondary btn-sm flex-1 disabled:opacity-30 text-xs"
                                  title="Переместить вверх"
                                >
                                  ⬆️ Вверх
                                </button>
                                <button
                                  onClick={() => updateOrder(menu.id, 'down')}
                                  disabled={index >= rootMenus.length - 1}
                                  className="btn btn-secondary btn-sm flex-1 disabled:opacity-30 text-xs"
                                  title="Переместить вниз"
                                >
                                  ⬇️ Вниз
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleActive(menu.id, menu.is_active)}
                                  className={`btn btn-sm flex-1 text-xs ${
                                    menu.is_active 
                                      ? 'btn-secondary' 
                                      : 'btn-primary'
                                  }`}
                                  title={menu.is_active ? 'Деактивировать меню' : 'Активировать меню'}
                                >
                                  {menu.is_active ? '⏸ Остановить' : '▶ Запустить'}
                                </button>
                                <button
                                  onClick={() => deleteMenu(menu.id)}
                                  className="btn btn-ghost btn-sm text-red-600 flex-1 text-xs border border-red-200"
                                  title="Удалить меню"
                                >
                                  🗑 Удалить
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {rootMenus.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-sm text-slate-500 mb-4">Меню не найдены</p>
          <button
            onClick={handleCreateNew}
            className="btn btn-primary"
          >
            Создать первое меню
          </button>
        </div>
      )}

      {/* Edit/Create Modal */}
      {(editingMenu || isCreatingNew) && (
        <MenuEditor
          menu={editingMenu}
          onClose={handleCloseEditor}
          onSave={() => {
            handleCloseEditor();
            loadMenus();
          }}
          allMenus={menus}
        />
      )}
    </div>
  );
}
