/**
 * Menu Service
 * Handles fetching and caching menu data from Supabase
 */

import { getServiceClient, BotMenu, BotText } from '../db/supabase';

interface MenuWithTexts extends BotMenu {
  texts: BotText[];
}

interface MenuTree extends MenuWithTexts {
  children?: MenuTree[];
}

// Cache for menus (keep small TTL to reflect admin changes quickly)
let menuCache: MenuTree[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 1000; // 5 seconds

/**
 * Get all active menus from Supabase
 */
export async function getActiveMenus(): Promise<MenuTree[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (menuCache && (now - cacheTimestamp) < CACHE_TTL) {
    return menuCache;
  }

  const supabase = getServiceClient();

  try {
    // Fetch active menus
    const { data: menus, error: menusError } = await supabase
      .from('bot_menus')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (menusError) {
      console.error('Error fetching menus:', menusError);
      throw menusError;
    }

    if (!menus || menus.length === 0) {
      console.warn('No active menus found');
      return [];
    }

    // Fetch all texts for these menus (including button_title)
    const menuIds = menus.map(m => m.id);
    
    // КРИТИЧНО: Явно указываем все поля, включая button_title
    const { data: texts, error: textsError } = await supabase
      .from('bot_texts')
      .select('id, menu_id, lang, text, button_title, text_before_photo, text_after_photo, photo_url, created_at, updated_at')
      .in('menu_id', menuIds);

    if (textsError) {
      console.error('[ERROR] Error fetching texts:', textsError);
      throw textsError;
    }
    
    // КРИТИЧНО: Проверяем что button_title действительно загружен
    console.log('[DEBUG][getActiveMenus] Raw texts from DB:', JSON.stringify(texts?.slice(0, 3), null, 2));
    if (texts && texts.length > 0) {
      const sampleText = texts[0];
      console.log('[DEBUG][getActiveMenus] Sample text object:', {
        has_button_title: 'button_title' in sampleText,
        button_title_value: sampleText.button_title,
        button_title_type: typeof sampleText.button_title,
        all_keys: Object.keys(sampleText),
      });
    }

    // Combine menus with their texts
    const menusWithTexts: MenuWithTexts[] = menus.map(menu => {
      const menuTexts = texts?.filter(t => t.menu_id === menu.id) || [];
      
      // DEBUG: Log what we actually got from database
      menuTexts.forEach(text => {
        console.log('[DEBUG][getActiveMenus]', {
          menu_id: menu.id,
          callback_data: menu.callback_data,
          text_id: text.id,
          lang: text.lang,
          button_title: text.button_title,
          button_title_type: typeof text.button_title,
          button_title_length: text.button_title?.length,
          text_preview: text.text?.substring(0, 30),
        });
      });
      
      return {
        ...menu,
        texts: menuTexts,
      };
    });

    // Build tree structure
    const menuTree = buildMenuTree(menusWithTexts);

    // Update cache
    menuCache = menuTree;
    cacheTimestamp = now;

    return menuTree;
  } catch (error) {
    console.error('Error in getActiveMenus:', error);
    // Return cached data if available, even if expired
    if (menuCache) {
      return menuCache;
    }
    throw error;
  }
}

/**
 * Build menu tree from flat list
 */
function buildMenuTree(menus: MenuWithTexts[]): MenuTree[] {
  const menuMap = new Map<string, MenuTree>();
  const rootMenus: MenuTree[] = [];

  // First pass: create all menu nodes
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  // Second pass: build tree structure
  menus.forEach(menu => {
    const node = menuMap.get(menu.id)!;
    
    if (menu.parent_id) {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }
    } else {
      rootMenus.push(node);
    }
  });

  return rootMenus;
}

/**
 * Get menu by callback_data
 * Always fetches fresh data (no cache) to ensure latest changes are reflected
 */
export async function getMenuByCallback(callbackData: string): Promise<MenuWithTexts | null> {
  // Force fresh fetch for individual menu lookups to get latest changes
  const supabase = getServiceClient();
  
  try {
    // Fetch menu by callback_data
    const { data: menu, error: menuError } = await supabase
      .from('bot_menus')
      .select('*')
      .eq('callback_data', callbackData)
      .eq('is_active', true)
      .single();

    if (menuError || !menu) {
      return null;
    }

    // Fetch texts for this menu (including button_title)
    const { data: texts, error: textsError } = await supabase
      .from('bot_texts')
      .select('id, menu_id, lang, text, button_title, text_before_photo, text_after_photo, photo_url, created_at, updated_at')
      .eq('menu_id', menu.id);

    if (textsError) {
      console.error('Error fetching texts:', textsError);
    }

    const result = {
      ...menu,
      texts: texts || [],
    };
    
    // DEBUG: Log what we got for this specific menu
    (texts || []).forEach(text => {
      console.log('[DEBUG][getMenuByCallback]', {
        callback_data: callbackData,
        menu_id: menu.id,
        text_id: text.id,
        lang: text.lang,
        button_title: text.button_title,
        button_title_type: typeof text.button_title,
        button_title_length: text.button_title?.length,
        text_preview: text.text?.substring(0, 30),
      });
    });
    
    return result;
  } catch (error) {
    console.error('Error in getMenuByCallback:', error);
    return null;
  }
}

/**
 * Get text for menu in specific language
 */
export function getMenuText(menu: MenuWithTexts, lang: 'ru' | 'kz' | 'en' = 'kz'): BotText | null {
  // Try requested language
  let text = menu.texts.find(t => t.lang === lang);
  
  // Fallback to kz if not found
  if (!text) {
    text = menu.texts.find(t => t.lang === 'kz');
  }
  
  // Fallback to any language
  if (!text && menu.texts.length > 0) {
    text = menu.texts[0];
  }

  return text || null;
}

/**
 * Clear menu cache (call after updates)
 */
export function clearMenuCache(): void {
  menuCache = null;
  cacheTimestamp = 0;
}
