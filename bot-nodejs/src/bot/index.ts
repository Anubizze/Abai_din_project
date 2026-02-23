/**
 * Telegram Bot
 * Main bot instance and handlers
 */

import { Telegraf, Context, Markup } from 'telegraf';
import { config } from '../config';
import { getActiveMenus, getMenuByCallback, getMenuText, clearMenuCache } from '../services/menu.service';
import { getOrCreateUser, logUserAction, getUserPreferredLang, setUserPreferredLang, updateUserPhone, updateUserTelegramMetadata, type BotLang } from '../services/user.service';
import { BotMenu, BotText } from '../db/supabase';

interface MenuTree extends BotMenu {
  texts: BotText[];
  children?: MenuTree[];
}

// Initialize bot
export const bot = new Telegraf(config.telegram.token);

const UI_TEXT: Record<BotLang, {
  welcome: string;
  chooseLang: string;
  langSaved: string;
  menuAgain: string;
  menuNotFound: string;
  textNotFound: string;
  genericError: string;
  botNotReady: string;
  useMenuButtons: string;
  untitled: string;
  phoneConsent: string;
  phoneButton: string;
  phoneThanks: string;
}> = {
  kz: {
    welcome: 'Қош келдіңіз!\nБұл «Абай облысы Дін мәселелерін зерттеу орталығы» КММ\nЕгер дін саласындағы сұрақтар мен мәселелеріңіз болса, келесі нұсқаулықпен өтуіңізді сұраймыз.\n\nТілді таңдаңыз: KZ / RU / EN',
    chooseLang: 'Тілді таңдаңыз:',
    langSaved: 'Тіл сақталды',
    menuAgain: 'Меню:',
    menuNotFound: 'Кешіріңіз, бұл меню табылмады. Меню кнопкаларын пайдаланыңыз.',
    textNotFound: 'Кешіріңіз, бұл меню үшін мәтін табылмады. Әкімшіге хабарласыңыз.',
    genericError: 'Қате орын алды. Кейінірек қайталаңыз.',
    botNotReady: 'Бот әлі бапталуда. Кейінірек қайталаңыз.',
    useMenuButtons: 'Навигация үшін меню батырмаларын пайдаланыңыз.\n\nҚайта бастау үшін /start командасын пайдаланыңыз.',
    untitled: 'Атаусыз',
    phoneConsent: 'Құрметті пайдаланушы,\nҚызмет сапасын арттыру және кері байланыс үшін байланыс нөмірін ұсынуыңызды сұраймыз.\nНөмір тек қызметтік мақсатта сақталады және үшінші тұлғаларға берілмейді.\nЕгер келіссеңіз, «Нөмірді жіберу» батырмасын басыңыз.',
    phoneButton: 'Нөмірді жіберу',
    phoneThanks: 'Рақмет! Нөміріңіз қабылданды.',
  },
  ru: {
    welcome: 'Добро пожаловать!\nЭто официальный Telegram-бот КГУ «Центр исследования проблем религий области Абай».\nЕсли у вас есть вопросы или проблемы в сфере религии, просим воспользоваться навигацией ниже.\n\nВыберите язык: KZ / RU / EN',
    chooseLang: 'Выберите язык:',
    langSaved: 'Язык сохранён',
    menuAgain: 'Меню:',
    menuNotFound: 'К сожалению, это меню не найдено. Пожалуйста, используйте кнопки меню.',
    textNotFound: 'К сожалению, для этого меню не найден текст. Пожалуйста, обратитесь к администратору.',
    genericError: 'Произошла ошибка. Пожалуйста, попробуйте позже.',
    botNotReady: 'Бот настраивается. Попробуйте позже.',
    useMenuButtons: 'Пожалуйста, используйте кнопки меню для навигации.\n\nДля перезапуска используйте /start.',
    untitled: 'Без названия',
    phoneConsent: 'Уважаемый пользователь,\nДля повышения качества обслуживания и обратной связи просим предоставить номер телефона.\nНомер хранится только в служебных целях и не передаётся третьим лицам.\nЕсли согласны — нажмите «Отправить номер».',
    phoneButton: 'Отправить номер',
    phoneThanks: 'Спасибо! Номер получен.',
  },
  en: {
    welcome: 'Welcome!\nThis is the official Telegram bot of the MSI \"Center for the Study of Religious Problems of the Abay Region\".\nIf you have any questions or concerns about religion, please use the navigation below.\n\nChoose language: KZ / RU / EN',
    chooseLang: 'Choose language:',
    langSaved: 'Language saved',
    menuAgain: 'Menu:',
    menuNotFound: 'Sorry, this menu was not found. Please use the menu buttons.',
    textNotFound: 'Sorry, there is no text for this menu. Please contact the administrator.',
    genericError: 'An error occurred. Please try again later.',
    botNotReady: 'Bot is being configured. Please try again later.',
    useMenuButtons: 'Please use the menu buttons for navigation.\n\nUse /start to restart.',
    untitled: 'Untitled',
    phoneConsent: 'Dear user,\nTo improve service quality and enable feedback, please share your phone number.\nThe number is stored for official purposes only and is not shared with third parties.\nIf you agree, press “Share phone number”.',
    phoneButton: 'Share phone number',
    phoneThanks: 'Thank you! Phone number received.',
  },
};

function t(lang: BotLang): typeof UI_TEXT.kz {
  return UI_TEXT[lang] ?? UI_TEXT.kz;
}

function langRow(current: BotLang) {
  const mk = (code: BotLang, label: string) => Markup.button.callback(
    current === code ? `${label} ✅` : label,
    `lang_${code}`
  );
  return [mk('kz', 'KZ'), mk('ru', 'RU'), mk('en', 'EN')];
}

/**
 * Build inline keyboard from menu tree
 */
function buildKeyboard(menus: MenuTree[], lang: BotLang): ReturnType<typeof Markup.inlineKeyboard> {
  console.log('[DEBUG][buildKeyboard] Starting, menus count:', menus.length);
  
  const buttons = menus.map(menu => {
    // СТРОГО: используем ТОЛЬКО button_title, fallback на text ЗАПРЕЩЕН
    let buttonText = t(lang).untitled;
    
    // КРИТИЧНО: Проверяем структуру данных
    console.log('[DEBUG][buildKeyboard] Menu:', {
      callback_data: menu.callback_data,
      menu_id: menu.id,
      texts_count: menu.texts?.length || 0,
      texts_is_array: Array.isArray(menu.texts),
    });
    
    if (menu.texts && Array.isArray(menu.texts) && menu.texts.length > 0) {
      // Ищем текст для выбранного языка
      const langText = menu.texts.find(t0 => t0.lang === lang) || menu.texts.find(t0 => t0.lang === 'kz') || menu.texts.find(t0 => t0.lang === 'ru') || menu.texts.find(t0 => t0.lang === 'en');
      
      // КРИТИЧНО: Проверяем что button_title существует в объекте
      if (langText) {
        console.log('[DEBUG][buildKeyboard] Text found:', {
          requested_lang: lang,
          resolved_lang: langText.lang,
          has_button_title_key: 'button_title' in langText,
          button_title_raw: langText.button_title,
          button_title_type: typeof langText.button_title,
          button_title_is_null: langText.button_title === null,
          button_title_is_undefined: langText.button_title === undefined,
          button_title_length: langText.button_title?.length,
          all_keys: Object.keys(langText),
        });
        
        // СТРОГО: только button_title
        if (langText.button_title && typeof langText.button_title === 'string' && langText.button_title.trim()) {
          buttonText = langText.button_title.trim();
          console.log(`[buildKeyboard] ✅✅✅ USING button_title: "${buttonText}"`);
        } else {
          // Если button_title пустой - используем заглушку
          buttonText = t(lang).untitled;
          console.log(`[buildKeyboard] ❌❌❌ button_title EMPTY. Value: "${langText.button_title}", Type: "${typeof langText.button_title}"`);
        }
      } else {
        // Если нет текста вообще, ищем любой язык с button_title
        console.log('[DEBUG][buildKeyboard] No text for menu, searching all languages...');
        const anyTextWithTitle = menu.texts.find(t => {
          const hasTitle = t.button_title && typeof t.button_title === 'string' && t.button_title.trim();
          console.log(`[DEBUG][buildKeyboard] Checking ${t.lang}: button_title="${t.button_title}", hasTitle=${!!hasTitle}`);
          return hasTitle;
        });
        
        if (anyTextWithTitle && anyTextWithTitle.button_title) {
          buttonText = anyTextWithTitle.button_title.trim();
          console.log(`[buildKeyboard] ✅✅✅ Using button_title from ${anyTextWithTitle.lang}: "${buttonText}"`);
        } else {
          buttonText = t(lang).untitled;
          console.log(`[buildKeyboard] ❌❌❌ No button_title found in ANY language`);
        }
      }
    } else {
      console.log(`[buildKeyboard] ❌❌❌ No texts array for menu ${menu.callback_data}`);
    }
    
    console.log(`[buildKeyboard] FINAL buttonText for ${menu.callback_data}: "${buttonText}"`);
    return [Markup.button.callback(buttonText, `menu_${menu.callback_data || menu.id}`)];
  });

  return Markup.inlineKeyboard([langRow(lang), ...buttons]);
}

/**
 * Send menu response (text, photo, etc.)
 * СТРОГИЙ порядок: основной текст → фото → текст после фото
 */
async function sendMenuResponse(ctx: Context, menuText: BotText, menu: BotMenu): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  // DEBUG: Логируем что отправляем
  console.log('[DEBUG][sendMenuResponse]', {
    menu_id: menu.id,
    callback_data: menu.callback_data,
    has_text: !!menuText.text,
    has_photo: !!menuText.photo_url,
    has_text_before_photo: !!menuText.text_before_photo,
    has_text_after_photo: !!menuText.text_after_photo,
  });

  const replyLong = async (text: string, options: Parameters<Context['reply']>[1]) => {
    const MAX = 3900; // Telegram limit is 4096, keep some headroom
    const clean = text ?? '';
    if (!clean.trim()) return;

    const parts: string[] = [];
    let remaining = clean;
    while (remaining.length > MAX) {
      // Prefer split on paragraph boundary, then newline, then space
      const slice = remaining.slice(0, MAX);
      const cut =
        Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
      const idx = cut > 200 ? cut : MAX; // avoid too-small fragments
      parts.push(remaining.slice(0, idx).trim());
      remaining = remaining.slice(idx).trim();
    }
    if (remaining.trim()) parts.push(remaining.trim());

    for (const part of parts) {
      await ctx.reply(part, options);
    }
  };

  // 1. СТРОГО: Отправляем основной текст (text) ПЕРВЫМ (с разбиением, если длинный)
  if (menuText.text && menuText.text.trim()) {
    await replyLong(menuText.text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    console.log('[DEBUG][sendMenuResponse] ✅ Sent main text');
  }

  // 2. СТРОГО: Отправляем фото ВТОРЫМ (только если photo_url есть)
  if (menuText.photo_url && menuText.photo_url.trim()) {
    try {
      // text_before_photo используется ТОЛЬКО как подпись к фото
      const rawCaption = menuText.text_before_photo?.trim() || '';
      const CAP_MAX = 1000; // Telegram caption limit is 1024
      const photoCaption = rawCaption ? (rawCaption.length > CAP_MAX ? rawCaption.slice(0, CAP_MAX) + '…' : rawCaption) : undefined;
      await ctx.replyWithPhoto(menuText.photo_url, {
        caption: photoCaption,
        parse_mode: 'HTML',
      });
      console.log('[DEBUG][sendMenuResponse] ✅ Sent photo with caption');

      // If caption was truncated, send remaining part as a message right after the photo
      if (rawCaption && rawCaption.length > CAP_MAX) {
        const rest = rawCaption.slice(CAP_MAX).trim();
        if (rest) {
          await replyLong(rest, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
        }
      }
    } catch (error) {
      console.error('[DEBUG][sendMenuResponse] ❌ Error sending photo:', error);
      // Если не удалось отправить фото, отправляем URL как текст
      await ctx.reply(`📷 Фото: ${menuText.photo_url}`, {
        parse_mode: 'HTML',
      });
    }
  } else {
    // ЗАПРЕЩЕНО: отправлять text_before_photo как отдельное сообщение, если фото нет
    // text_before_photo используется ТОЛЬКО как подпись к фото
    if (menuText.text_before_photo && menuText.text_before_photo.trim()) {
      console.log('[DEBUG][sendMenuResponse] ⚠️ text_before_photo ignored (no photo_url)');
    }
  }

  // 3. СТРОГО: Отправляем текст после фото ТРЕТЬИМ (с разбиением, если длинный)
  if (menuText.text_after_photo && menuText.text_after_photo.trim()) {
    await replyLong(menuText.text_after_photo, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    console.log('[DEBUG][sendMenuResponse] ✅ Sent text_after_photo');
  }
}

/**
 * Handle /start command
 */
bot.command('start', async (ctx) => {
  try {
    const telegramId = ctx.from?.id;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bot-nodejs/src/bot/index.ts:/start',message:'start handler entry',data:{hasFrom:!!ctx.from,telegramId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
    if (!telegramId) return;

    // Refresh Telegram metadata on each interaction
    await updateUserTelegramMetadata(telegramId, ctx.from);

    // Get or create user
    const user = await getOrCreateUser(
      telegramId,
      ctx.from.username,
      `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim()
    );

    // Update Telegram metadata on each interaction
    let photoId: string | null = null;
    try {
      const photos = await bot.telegram.getUserProfilePhotos(telegramId, 0, 1);
      const firstPhoto = photos?.photos?.[0]?.[0];
      photoId = firstPhoto?.file_id ?? null;
    } catch (error) {
      console.error('Error loading user profile photo:', error);
    }
    await updateUserTelegramMetadata(telegramId, ctx.from, photoId);

    const userLang: BotLang = (user.preferred_lang as BotLang | null) ?? 'kz';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bot-nodejs/src/bot/index.ts:/start',message:'resolved userLang',data:{userLang,preferredLang:user.preferred_lang},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion agent log

    // Log action
    await logUserAction(telegramId, 'command', '/start', undefined, {
      userLang,
      metadata: { source: 'command' },
    });

    // СТРОГО: Очищаем кеш ПЕРЕД каждым запросом
    clearMenuCache();
    console.log('[DEBUG][start] Cache cleared, fetching fresh data...');
    
    // Get active menus (root level)
    const menus = await getActiveMenus();
    const rootMenus = menus.filter(m => !m.parent_id) as MenuTree[];
    
    // DEBUG: Детальное логирование ВСЕХ данных
    console.log('[DEBUG][start] ========================================');
    console.log('[DEBUG][start] Total menus loaded:', rootMenus.length);
    rootMenus.forEach((menu, index) => {
      const kzText = menu.texts?.find(t => t.lang === 'kz');
      console.log(`[DEBUG][start] Menu #${index + 1}:`, {
        callback_data: menu.callback_data,
        menu_id: menu.id.substring(0, 8) + '...',
        texts_count: menu.texts?.length || 0,
        kzText_exists: !!kzText,
        button_title: kzText?.button_title || 'NULL/EMPTY',
        button_title_type: typeof kzText?.button_title,
        button_title_length: kzText?.button_title?.length || 0,
        text_preview: kzText?.text?.substring(0, 30) || 'NO TEXT',
        all_texts: menu.texts?.map(t => ({
          lang: t.lang,
          button_title: t.button_title || 'NULL',
          has_button_title: !!t.button_title && t.button_title.trim().length > 0,
        })) || [],
      });
    });
    console.log('[DEBUG][start] ========================================');

    if (rootMenus.length === 0) {
      await ctx.reply(t(userLang).botNotReady);
      return;
    }

    // Welcome text (per language)
    const welcomeText = t(userLang).welcome;

    // Build keyboard
    const keyboard = buildKeyboard(rootMenus, userLang);

    await ctx.reply(welcomeText, {
      ...keyboard,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bot-nodejs/src/bot/index.ts:/start',message:'sent welcome + inline keyboard',data:{inlineButtons:keyboard?.reply_markup?.inline_keyboard?.length ?? null},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log

    // Formal consent + contact request (reply keyboard)
    await ctx.reply(
      `${t(userLang).phoneConsent}\n\n${userLang === 'ru' ? 'Если кнопка не видна — откройте клавиатуру внизу чата.' : userLang === 'kz' ? 'Егер батырма көрінбесе — чаттың төменгі жағындағы пернетақтаны ашыңыз.' : 'If the button is not visible, open the keyboard at the bottom of the chat.'}`,
      Markup.keyboard([[Markup.button.contactRequest(t(userLang).phoneButton)]])
        .resize()
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bot-nodejs/src/bot/index.ts:/start',message:'sent contact request keyboard',data:{phoneButton:t(userLang).phoneButton},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bot-nodejs/src/bot/index.ts:/start',message:'start handler error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion agent log
    console.error('Error in /start handler:', error);
    await ctx.reply('Произошла ошибка при загрузке меню. Пожалуйста, попробуйте позже.\n\nМеню жүктеу кезінде қате орын алды. Кейінірек қайталаңыз.');
  }
});

/**
 * Handle contact sharing (phone number)
 */
bot.on('contact', async (ctx) => {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const contact = ctx.message?.contact;
    if (!contact) return;

    if (contact.user_id && contact.user_id !== telegramId) {
      await ctx.reply('Контакт не соответствует вашему профилю.');
      return;
    }

    await updateUserPhone(telegramId, contact.phone_number);
    await updateUserTelegramMetadata(telegramId, ctx.from);

    await logUserAction(telegramId, 'share_contact', contact.phone_number, undefined, {
      metadata: { source: 'contact' },
      userLang: (await getUserPreferredLang(telegramId)) ?? null,
    });

    const userLang: BotLang = (await getUserPreferredLang(telegramId)) ?? 'kz';
    await ctx.reply(t(userLang).phoneThanks, Markup.removeKeyboard());
  } catch (error) {
    console.error('Error handling contact:', error);
  }
});

/**
 * Handle callback queries (button clicks)
 */
bot.on('callback_query', async (ctx) => {
  try {
    // Type guard для callback_query
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      return;
    }
    
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData) return;

    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bot-nodejs/src/bot/index.ts:callback_query',message:'callback query received',data:{telegramId,callbackData:ctx.callbackQuery?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion agent log

    // Handle language selection
    if (callbackData.startsWith('lang_')) {
      const lang = callbackData.replace('lang_', '') as BotLang;
      if (!['kz', 'ru', 'en'].includes(lang)) {
        await ctx.answerCbQuery('Unknown language');
        return;
      }

      try {
        await setUserPreferredLang(telegramId, lang);
        await logUserAction(telegramId, 'set_lang', lang, undefined, {
          userLang: lang,
          metadata: { source: 'callback' },
        });
      } catch (e) {
        console.error('[ERROR] Failed to set preferred_lang:', e);
        await ctx.answerCbQuery(t(lang).genericError);
        await ctx.reply(
          'Не удалось сохранить язык. Пожалуйста, примените миграцию `supabase/migrations/015_add_user_preferred_lang.sql` в Supabase (SQL Editor), затем попробуйте снова.\n\n' +
          'Тілді сақтау мүмкін болмады. Supabase (SQL Editor) ішінде `supabase/migrations/015_add_user_preferred_lang.sql` миграциясын орындаңыз да, қайта көріңіз.'
        );
        return;
      }

      // Reload root menu in selected language
      clearMenuCache();
      const menus = await getActiveMenus();
      const rootMenus = menus.filter(m => !m.parent_id) as MenuTree[];
      const keyboard = buildKeyboard(rootMenus, lang);

      await ctx.editMessageText(t(lang).welcome, {
        ...keyboard,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
      await ctx.answerCbQuery(t(lang).langSaved);
      return;
    }

    // Handle menu callbacks
    if (callbackData.startsWith('menu_')) {
      const menuCallback = callbackData.replace('menu_', '');

      // Resolve user language ASAP (so we can localize errors too)
      const userLang: BotLang = (await getUserPreferredLang(telegramId)) ?? 'kz';
      
      // DEBUG: Логируем callback_data
      console.log('[DEBUG][callback]', {
        callback_data: callbackData,
        menuCallback: menuCallback,
      });
      
      // СТРОГО: Очищаем кеш ПЕРЕД каждым запросом
      clearMenuCache();
      
      // Get menu by callback_data (всегда свежий запрос)
      const menu = await getMenuByCallback(menuCallback);
      
      if (!menu) {
        await ctx.answerCbQuery(t(userLang).menuNotFound);
        await ctx.reply(t(userLang).menuNotFound);
        return;
      }

      // Log action
      await logUserAction(telegramId, 'button_click', menuCallback, menu.id, {
        userLang,
        metadata: { menu_callback: menuCallback },
      });

      // Get text for menu (user language)
      const menuText = getMenuText(menu, userLang);
      
      if (!menuText) {
        await ctx.answerCbQuery(t(userLang).textNotFound);
        await ctx.reply(t(userLang).textNotFound);
        return;
      }

      // Check if menu has children (submenu) - нужно проверить через getActiveMenus
      const allMenus = await getActiveMenus();
      const menuWithChildren = allMenus.find(m => m.id === menu.id);
      
      if (menuWithChildren && menuWithChildren.children && menuWithChildren.children.length > 0) {
        // Show submenu
        const keyboard = buildKeyboard(menuWithChildren.children, userLang);
        await ctx.editMessageText(
          menuText.text || t(userLang).chooseLang,
          {
            ...keyboard,
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          }
        );
        await ctx.answerCbQuery();
      } else {
        // Send menu response
        await sendMenuResponse(ctx, menuText, menu);

        // ✅ Send menu again in a new message so user doesn't need to scroll up
        const rootMenus = allMenus.filter(m => !m.parent_id) as MenuTree[];
        const keyboard = buildKeyboard(rootMenus, userLang);
        await ctx.reply(t(userLang).menuAgain, {
          ...keyboard,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        });

        await ctx.answerCbQuery();
      }
    }
  } catch (error) {
    console.error('Error in callback_query handler:', error);
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery('Произошла ошибка');
    }
    await ctx.reply('Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.\n\nСұрауды өңдеу кезінде қате орын алды. Кейінірек қайталаңыз.');
  }
});

/**
 * Handle text messages (fallback)
 */
bot.on('text', async (ctx) => {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const text = ctx.message?.text;
    if (!text) return;

    const userLang: BotLang = (await getUserPreferredLang(telegramId)) ?? 'kz';

    // Log action
    await logUserAction(telegramId, 'message', text, undefined, {
      userLang,
      metadata: { source: 'text_message' },
    });

    // Try to find menu by text (for backward compatibility)
    const menu = await getMenuByCallback(text);
    
    if (menu) {
      const menuText = getMenuText(menu, userLang);
      if (menuText) {
        await sendMenuResponse(ctx, menuText, menu);
        return;
      }
    }

    // Default response - если пользователь отправил текст, которого нет в обработчиках
    await ctx.reply(t(userLang).useMenuButtons);
  } catch (error) {
    console.error('Error in text handler:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.\n\nҚате орын алды. Кейінірек қайталаңыз.');
  }
});

/**
 * Error handler
 */
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.\n\nҚате орын алды. Кейінірек қайталаңыз.');
});

/**
 * Start bot
 */
export async function startBot(): Promise<void> {
  try {
    console.log('🤖 Starting Telegram bot...');
    
    // Test connection
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot connected: @${botInfo.username} (${botInfo.first_name})`);
    console.log('📝 DEBUG logging enabled - check console when sending /start');
    console.log('⚠️  All menu operations will be logged with [DEBUG] prefix');

    // Start polling
    await bot.launch({
      dropPendingUpdates: true,
    });

    console.log('✅ Bot is running and waiting for messages...');
    
    // Graceful shutdown
    process.once('SIGINT', () => {
      console.log('🛑 Shutting down bot...');
      bot.stop('SIGINT');
    });
    
    process.once('SIGTERM', () => {
      console.log('🛑 Shutting down bot...');
      bot.stop('SIGTERM');
    });
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}
