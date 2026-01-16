"""Menu button handlers"""
from telebot import types
from bot.bot import bot
from keyboards.main import get_main_keyboard
from database.user import log_user_action
from utils.admin import is_admin


# Content responses for menu buttons
SOCIAL_LINKS = (
    "\n\nБіздің әлеуметтік желідегі парақшаларға тіркеліп, пайдалы ақпарат ал:\n\n"
    "Instagram:\n"
    "https://www.instagram.com/antiterror_abai/?hl=ru&g=5\n"
    "https://www.instagram.com/dinisteri_abai_oblysy/?hl=ru&g=5\n"
    "https://www.instagram.com/din_abai_obl/?hl=ru\n\n"
    "Telegram: https://t.me/religion_abai\n\n"
    "Tiktok: https://www.tiktok.com/@cipr_abai?_r=1&_t=ZM-931pELSiPet\n\n"
    "@mail: cipr_semey@mail.ru"
)

MENU_RESPONSES = {
    "Дін туралы ақпарат": (
        "Қош келдіңіз!\n\n"
        "Бұл «Абай облысы Дін мәселелерін зерттеу орталығы» КММ\n\n"
        "Егер дін саласындағы сұрақтар мен мәселелеріңіз болса, келесі нұсқаулықпен өтуіңізді сұраймыз.\n\n"
        "Қолдану нұсқаулығы:\n\n"
        "дін – дін туралы ақпарат\n\n"
        "Дін деген не?\n\n"
        "Дін – адамның дүниені, өмірдің мәнін және адамгершілік құндылықтарды түсіну жүйесі. Ол сенімге, моральға және рухани тәрбиеге негізделеді.\n\n"
        "Діннің негізгі мақсаты:\n\n"
        "* Адамды ізгілікке, сабыр мен жауапкершілікке тәрбиелеу\n\n"
        "* Қоғамда бейбітшілік пен өзара құрметті нығайту\n\n"
        "* Рухани құндылықтарды сақтау\n\n"
        "Маңыздысы:\n\n"
        "Дін – жеке адамның таңдауы. Қазақстан – зайырлы мемлекет, онда әр азаматтың ар-ождан және сенім бостандығы заңмен қорғалады.\n\n"
        "Ескерту:\n\n"
        "Дін ешқашан зорлық-зомбылықты, өшпенділікті немесе экстремизмді ақтамайды." + SOCIAL_LINKS
    ),
    
    "Дін саласындағы заңнамалар": {
        "text_before_photo": (
            "заң – дін саласындағы заңнамалар\n\n"
            "📌 Қазақстан Республикасының Конституциясы (негізгі Заң) — діни бостандықты, сенім еркіндігін және зайырлылық қағидаларын қамтамасыз етеді:\n\n"
            "🔗 https://adilet.zan.kz/kaz/docs/K950001000_\n\n"
            "📌 «Діни қызмет және діни бірлестіктер туралы» Қазақстан Республикасы Заңы (2011 ж. № 483-IV) — діни қызметті, діни бірлестіктерді тіркеу, олардың құқықтық мәртебесі мен реттелу тәртібін белгілейді:\n\n"
            "🔗 https://adilet.zan.kz/kaz/docs/Z1100000483\n\n"
            "📌 Қоғамдық қызмет көрсету ережелері — діни қызмет саласындағы мемлекеттік қызмет көрсету қағидалары (қызмет көрсету тәртібі мен талаптары):\n\n"
            "🔗 https://adilet.zan.kz/kaz/docs/V2000020256\n\n"
            "📌 «Қазақстан Республикасының діни қызмет және діни бірлестіктер туралы заңнамасын бұзу» туралы заң діни қызмет саласына қатысты заңдардың талаптарын орындамаудың әкімшілік жауапкершілігін белгілейді:\n\n"
            "🔗 https://adilet.zan.kz/kaz/docs/K1400000235#z490"
        ),
        "photo": "public/Screenshot 2026-01-14 171305.png",
        "text_after_photo": SOCIAL_LINKS
    },
    
    "Қауіп белгілері": (
        "қауіп – қауіп белгілері мен қауіпсіздік шаралары\n\n"
        "⚠️ Діни радикалдану мен деструктивті ықпалдың қауіп белгілері\n\n"
        "🚩 Бөлуші риторика\n"
        "– «Біз ғана дұрыс жолдамыз, басқалар – адасқан» деп қоғамды бөлу\n"
        "– Мемлекетке, заңға, зайырлы жүйеге қарсы ұстанымдар\n\n"
        "🚩 Соқыр мойынсұну\n"
        "– Белгілі бір тұлғаны немесе топты абсолютті шындық иесі деп тану\n"
        "– Сұрақ қоюға, күмәндануға тыйым салу\n\n"
        "🚩 Отбасынан және қоғамнан оқшаулау\n"
        "– Туыстармен, достармен қарым-қатынасты үзуге үгіттеу\n"
        "– «Олар сені түсінбейді» деген ойды сіңіру\n\n"
        "🚩 Заңды жоққа шығару\n"
        "– Мемлекеттік заңдар «дінге қарсы» деген пікір тарату\n"
        "– Заңды бұзуды ақтау\n\n"
        "🚩 Жасырын әрекеттер\n"
        "– Жабық чаттар, құпия кездесулер\n"
        "– Ақпаратты тек «өз арналарынан» алуды талап ету\n\n"
        "🚩 Зорлық-зомбылықты ақтау\n"
        "– Қақтығысты, өшпенділікті, күш қолдануды «қасиетті міндет» ретінде көрсету\n\n"
        "⚠️ Назар аударыңыз!\n\n"
        "Деструктивті діни ағымдардың теріс ықпалын болдырмау мақсатында интернет кеңістігінде келесі қарапайым қауіпсіздік шараларын сақтауды сұраймыз:\n\n"
        "🚩 Жеке ақпаратқа қолжетімділікті шектеңіз: жеке деректеріңізді, телефон нөмірін, мекенжайды, құжаттарды жарияламаңыз.\n\n"
        "🚩 Бейтаныс адамдар шақырған күмәнді діни қауымдастықтарға қосылмаңыз: жабық чаттар, топтар, беймәлім парақшалардан сақ болыңыз.\n\n"
        "🚩 Өзге пайдаланушылардан келіп түсетін хабарламалардағы сілтемелер арқылы өтуде абай болыңыз: күмәнді сайттар мен материалдар экстремистік мазмұн таратуы мүмкін.\n\n"
        "🚩 Өз санаңызды өзге біреудің басқаруына жол бермеңіз: сыни ойлауды сақтаңыз, ақпаратты тек ресми дереккөздерден тексеріңіз.\n\n" + SOCIAL_LINKS
    ),
    
    "Ата-аналарға кеңес": {
        "text_before_photo": (
            "ата-ана – ата-аналарға кеңес\n\n"
            "Балаңыздың деструктивті діни ағым ықпалына түскенін келесі өзгерістерден байқауға болады:\n\n"
            "– отбасы мен достарына немқұрайлылық танытып, оқуға және әдеттегі хоббилеріне қызығушылығы төмендесе;\n\n"
            "– күнделікті, үйреншікті нәрселерге орынсыз ашумен жауап беріп, барлығына немқұрайлы қараса;\n\n"
            "– бұрын-соңды қолданбаған діни терминдер мен дәйексөздерді жиі қолданса;\n\n"
            "– әдеттері мен киім үлгісі өзгеріп, мінезі тұйықталып, көп уақытын діни кітаптарды оқумен өткізсе.\n\n"
            "Балаңыздың арбалуына жол бермеу үшін онымен жиі сөйлесіп, ең жақын және сенімді досы болыңыз.\n\n"
            "Балаңыздың интернет-кеңістіктегі қызығушылықтарын бақылауға алыңыз.\n\n"
            "Сақ болыңыз, өзіңізді және балаңызды қорғаңыз!"
        ),
        "photo": "public/Screenshot 2026-01-14 171508.png",
        "text_after_photo": SOCIAL_LINKS
    },
    
    "Көмек және байланыс": (
        "көмек – дін саласындағы теолог пен психолог мамандарынан көмек\n\n"
        "Дін саласындағы теолог пен психолог мамандарынан көмек керек болған жағдайда өз телефон нөміріңізді қалдырыңыз: _____________________" + SOCIAL_LINKS
    )
}


# Функция для проверки, является ли сообщение кнопкой меню
def is_menu_button(message: types.Message) -> bool:
    """Check if message is a menu button"""
    import sys
    try:
        if not message or not message.text:
            return False
        
        button_text = message.text.strip()
        is_menu = button_text in MENU_RESPONSES
        
        # Отладка: логируем проверку
        if is_menu:
            print(f"[DEBUG is_menu_button] Найдена кнопка меню: '{button_text}'", flush=True)
            sys.stdout.flush()
        else:
            # Логируем только первые несколько проверок, чтобы не засорять лог
            if hasattr(is_menu_button, '_debug_count'):
                is_menu_button._debug_count += 1
            else:
                is_menu_button._debug_count = 1
            
            if is_menu_button._debug_count <= 3:
                print(f"[DEBUG is_menu_button] Не кнопка меню: '{button_text}' (доступные: {list(MENU_RESPONSES.keys())})", flush=True)
                sys.stdout.flush()
        
        return is_menu
    except Exception as e:
        print(f"[ERROR is_menu_button] Ошибка: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        return False


# Функция для получения текста ответа (поддерживает старый формат строк и новый формат словарей)
def get_response_text(button_text: str) -> str:
    """Get response text for button, handling both old string format and new dict format"""
    response = MENU_RESPONSES.get(button_text)
    if isinstance(response, dict):
        # Новый формат - возвращаем текст до фото
        return response.get("text_before_photo", "")
    elif isinstance(response, str):
        # Старый формат - возвращаем весь текст
        return response
    return ""


# Обработчик кнопок меню должен срабатывать ПЕРВЫМ (высокий приоритет)
# Используем явную функцию вместо lambda для лучшей отладки
# Увеличиваем приоритет до 200, чтобы он точно обрабатывался первым
@bot.message_handler(func=is_menu_button)
def handle_menu_button(message: types.Message):
    """Handle menu button clicks"""
    import sys
    
    # Сразу логируем, что обработчик вызван
    print(f"\n{'='*60}", flush=True)
    print(f"🔥🔥🔥 [MENU BUTTON] ОБРАБОТЧИК ВЫЗВАН! 🔥🔥🔥", flush=True)
    print(f"   Текст сообщения: '{message.text if message.text else 'None'}'", flush=True)
    print(f"   Пользователь: {message.from_user.id if message.from_user else 'None'}", flush=True)
    print(f"{'='*60}\n", flush=True)
    sys.stdout.flush()
    
    try:
        button_text = message.text.strip() if message.text else None
        if not button_text:
            print(f"  [MENU BUTTON] Пустой текст кнопки", flush=True)
            sys.stdout.flush()
            return
        
        user_id = message.from_user.id if message.from_user else None
        if not user_id:
            print(f"  [MENU BUTTON] Нет информации о пользователе", flush=True)
            sys.stdout.flush()
            return
        
        print(f"\n{'='*60}", flush=True)
        print(f"✅✅✅ [MENU BUTTON] ОБРАБОТЧИК КНОПКИ ВЫЗВАН! ✅✅✅", flush=True)
        print(f"   Кнопка: '{button_text}'", flush=True)
        print(f"   Пользователь: {user_id}", flush=True)
        print(f"   Chat ID: {message.chat.id}", flush=True)
        print(f"{'='*60}\n", flush=True)
        sys.stdout.flush()
        
        # Проверяем, не ожидает ли пользователь ввода кода админки
        from handlers.admin import _waiting_for_code
        if user_id in _waiting_for_code:
            print(f"  [MENU BUTTON] Пользователь ожидает ввода кода, пропускаю", flush=True)
            sys.stdout.flush()
            return
        
        # Проверяем, не является ли это кнопкой админ-панели
        admin_buttons = [
            "📊 Статистика",
            "👥 Активные сегодня",
            "📁 Архив по дате",
            "🚪 Выйти из админ-панели",
            "🔙 Назад"
        ]
        if button_text in admin_buttons or button_text.startswith("📅 "):
            print(f"  [MENU BUTTON] Это кнопка админ-панели, пропускаю", flush=True)
            sys.stdout.flush()
            return
        
        # Проверяем, что кнопка есть в словаре ответов
        if button_text not in MENU_RESPONSES:
            print(f"  [ERROR] Кнопка '{button_text}' не найдена в MENU_RESPONSES!", flush=True)
            print(f"  [DEBUG] Доступные кнопки: {list(MENU_RESPONSES.keys())}", flush=True)
            sys.stdout.flush()
            bot.reply_to(
                message,
                "К сожалению, произошла ошибка. Попробуйте выбрать другую кнопку.",
                reply_markup=get_main_keyboard()
            )
            return
        
        print(f"  [MENU BUTTON] Обрабатываю кнопку меню", flush=True)
        sys.stdout.flush()
        
        # Log user action
        try:
            log_user_action(user_id, 'button_click', button_text)
            print(f"  [OK] Действие залогировано", flush=True)
        except Exception as e:
            print(f"  [WARNING] Ошибка логирования: {e}", flush=True)
            sys.stdout.flush()
        
        # Получаем ответ
        response = MENU_RESPONSES[button_text]
        print(f"  [MENU BUTTON] Обрабатываю ответ для '{button_text}'", flush=True)
        sys.stdout.flush()
        
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Проверяем формат ответа (новый словарь или старая строка)
        if isinstance(response, dict):
            # Новый формат: текст -> фото -> текст после фото
            text_before = response.get("text_before_photo", "")
            photo_path = response.get("photo")
            text_after = response.get("text_after_photo", "")
            
            # Отправляем первый текст
            if text_before:
                if len(text_before) > 4096:
                    text_before = text_before[:4090] + "..."
                try:
                    result = bot.reply_to(
                        message,
                        text_before,
                        reply_markup=get_main_keyboard()
                    )
                    print(f"  [MENU BUTTON] ✅ Первый текст отправлен", flush=True)
                    sys.stdout.flush()
                except Exception as send_error:
                    print(f"  [ERROR] Ошибка при отправке первого текста: {send_error}", flush=True)
                    sys.stdout.flush()
            
            # Отправляем фото
            if photo_path:
                full_photo_path = os.path.join(base_dir, photo_path)
                if os.path.exists(full_photo_path):
                    try:
                        with open(full_photo_path, 'rb') as photo:
                            bot.send_photo(
                                message.chat.id,
                                photo,
                                reply_markup=get_main_keyboard()
                            )
                        print(f"  [MENU BUTTON] ✅ Фото отправлено", flush=True)
                        sys.stdout.flush()
                    except Exception as photo_error:
                        print(f"  [MENU BUTTON] ⚠️ Ошибка при отправке фото: {photo_error}", flush=True)
                        sys.stdout.flush()
                else:
                    print(f"  [MENU BUTTON] ⚠️ Файл фото не найден: {full_photo_path}", flush=True)
                    sys.stdout.flush()
            
            # Отправляем текст после фото
            if text_after:
                if len(text_after) > 4096:
                    text_after = text_after[:4090] + "..."
                try:
                    bot.send_message(
                        message.chat.id,
                        text_after,
                        reply_markup=get_main_keyboard()
                    )
                    print(f"  [MENU BUTTON] ✅ Текст после фото отправлен", flush=True)
                    sys.stdout.flush()
                except Exception as send_error:
                    print(f"  [ERROR] Ошибка при отправке текста после фото: {send_error}", flush=True)
                    sys.stdout.flush()
        else:
            # Старый формат: просто текст
            response_text = response
            if len(response_text) > 4096:
                response_text = response_text[:4090] + "..."
            try:
                result = bot.reply_to(
                    message,
                    response_text,
                    reply_markup=get_main_keyboard()
                )
                print(f"  [MENU BUTTON] ✅✅✅ Ответ успешно отправлен!", flush=True)
                sys.stdout.flush()
            except Exception as send_error:
                print(f"  [ERROR] Ошибка при отправке через reply_to: {send_error}", flush=True)
                import traceback
                traceback.print_exc()
                sys.stdout.flush()
                
                # Пробуем send_message
                try:
                    print(f"  [MENU BUTTON] Пробую отправить через send_message...", flush=True)
                    sys.stdout.flush()
                    result = bot.send_message(
                        message.chat.id,
                        response_text,
                        reply_markup=get_main_keyboard()
                    )
                    print(f"  [MENU BUTTON] ✅ Ответ отправлен через send_message", flush=True)
                    sys.stdout.flush()
                except Exception as send_msg_error:
                    print(f"  [ERROR] Ошибка при отправке через send_message: {send_msg_error}", flush=True)
                    traceback.print_exc()
                    sys.stdout.flush()
                    
                    # Последняя попытка - без клавиатуры
                    try:
                        result = bot.send_message(message.chat.id, response_text[:1000] + "...")
                        print(f"  [MENU BUTTON] ✅ Отправлено без клавиатуры (урезанный текст)", flush=True)
                        sys.stdout.flush()
                    except Exception as final_error:
                        print(f"  [ERROR] Критическая ошибка отправки: {final_error}", flush=True)
                        traceback.print_exc()
                        sys.stdout.flush()
                        # Не поднимаем исключение, чтобы не сломать бота
    
    except Exception as e:
        print(f"\n[ERROR] КРИТИЧЕСКАЯ ОШИБКА в handle_menu_button: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        try:
            bot.reply_to(
                message,
                "Произошла ошибка при обработке запроса. Попробуйте позже.",
                reply_markup=get_main_keyboard()
            )
        except:
            pass


# Вспомогательная функция для обработки ответов (должна быть определена ПЕРЕД обработчиками)
def _handle_menu_response(message: types.Message, button_text: str):
    """Helper function to handle menu button responses"""
    import sys
    try:
        print(f"\n{'='*60}", flush=True)
        print(f"✅ [DIRECT HANDLER] Обработка кнопки '{button_text}'", flush=True)
        print(f"   Пользователь: {message.from_user.id if message.from_user else 'None'}", flush=True)
        print(f"{'='*60}\n", flush=True)
        sys.stdout.flush()
        
        user_id = message.from_user.id if message.from_user else None
        
        # Проверяем, не ожидает ли пользователь ввода кода админки
        from handlers.admin import _waiting_for_code
        if user_id and user_id in _waiting_for_code:
            return
        
        if button_text not in MENU_RESPONSES:
            return
        
        response = MENU_RESPONSES[button_text]
        
        # Логируем действие
        try:
            if user_id:
                log_user_action(user_id, 'button_click', button_text)
        except:
            pass
        
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Проверяем формат ответа (новый словарь или старая строка)
        if isinstance(response, dict):
            # Новый формат: текст -> фото -> текст после фото
            text_before = response.get("text_before_photo", "")
            photo_path = response.get("photo")
            text_after = response.get("text_after_photo", "")
            
            # Отправляем первый текст
            if text_before:
                if len(text_before) > 4096:
                    text_before = text_before[:4090] + "..."
                bot.reply_to(
                    message,
                    text_before,
                    reply_markup=get_main_keyboard()
                )
                print(f"  [DIRECT HANDLER] ✅ Первый текст отправлен для '{button_text}'", flush=True)
                sys.stdout.flush()
            
            # Отправляем фото
            if photo_path:
                full_photo_path = os.path.join(base_dir, photo_path)
                if os.path.exists(full_photo_path):
                    try:
                        with open(full_photo_path, 'rb') as photo:
                            bot.send_photo(
                                message.chat.id,
                                photo,
                                reply_markup=get_main_keyboard()
                            )
                        print(f"  [DIRECT HANDLER] ✅ Фото отправлено для '{button_text}'", flush=True)
                        sys.stdout.flush()
                    except Exception as photo_error:
                        print(f"  [DIRECT HANDLER] ⚠️ Ошибка при отправке фото: {photo_error}", flush=True)
                        sys.stdout.flush()
                else:
                    print(f"  [DIRECT HANDLER] ⚠️ Файл фото не найден: {full_photo_path}", flush=True)
                    sys.stdout.flush()
            
            # Отправляем текст после фото
            if text_after:
                if len(text_after) > 4096:
                    text_after = text_after[:4090] + "..."
                bot.send_message(
                    message.chat.id,
                    text_after,
                    reply_markup=get_main_keyboard()
                )
                print(f"  [DIRECT HANDLER] ✅ Текст после фото отправлен для '{button_text}'", flush=True)
                sys.stdout.flush()
        else:
            # Старый формат: просто текст
            response_text = response
            if len(response_text) > 4096:
                response_text = response_text[:4090] + "..."
            bot.reply_to(
                message,
                response_text,
                reply_markup=get_main_keyboard()
            )
            print(f"  [DIRECT HANDLER] ✅ Ответ отправлен для '{button_text}'", flush=True)
            sys.stdout.flush()
        
    except Exception as e:
        print(f"  [DIRECT HANDLER] Ошибка: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()


# Вспомогательная функция для создания фильтров кнопок
def make_button_filter(button_text: str):
    """Create a filter function for a specific button"""
    def filter_func(message: types.Message) -> bool:
        return bool(message.text and message.text.strip() == button_text)
    return filter_func

# Прямые обработчики для каждой кнопки (гарантированно сработают)
@bot.message_handler(func=make_button_filter("Дін туралы ақпарат"))
def handle_din_info(message: types.Message):
    """Handle 'Дін туралы ақпарат' button"""
    _handle_menu_response(message, "Дін туралы ақпарат")

@bot.message_handler(func=make_button_filter("Дін саласындағы заңнамалар"))
def handle_din_laws(message: types.Message):
    """Handle 'Дін саласындағы заңнамалар' button"""
    _handle_menu_response(message, "Дін саласындағы заңнамалар")

@bot.message_handler(func=make_button_filter("Қауіп белгілері"))
def handle_danger_signs(message: types.Message):
    """Handle 'Қауіп белгілері' button"""
    _handle_menu_response(message, "Қауіп белгілері")

@bot.message_handler(func=make_button_filter("Ата-аналарға кеңес"))
def handle_parents_advice(message: types.Message):
    """Handle 'Ата-аналарға кеңес' button"""
    _handle_menu_response(message, "Ата-аналарға кеңес")

@bot.message_handler(func=make_button_filter("Көмек және байланыс"))
def handle_help_contact(message: types.Message):
    """Handle 'Көмек және байланыс' button"""
    _handle_menu_response(message, "Көмек және байланыс")


# Запасной обработчик на случай, если основной не сработает
# Этот обработчик проверяет все кнопки меню и имеет приоритет 150
def is_any_menu_button(message: types.Message) -> bool:
    """Check if message is any menu button (fallback)"""
    if not message or not message.text:
        return False
    button_text = message.text.strip()
    return button_text in MENU_RESPONSES

@bot.message_handler(func=is_any_menu_button)
def handle_menu_button_fallback(message: types.Message):
    """Fallback handler for menu buttons"""
    import sys
    try:
        button_text = message.text.strip() if message.text else None
        if not button_text or button_text not in MENU_RESPONSES:
            return  # Не обрабатываем, пусть основной обработчик попробует
        
        print(f"[FALLBACK HANDLER] ⚠️ Запасной обработчик сработал для '{button_text}'", flush=True)
        print(f"   Это означает, что основной обработчик не сработал!", flush=True)
        sys.stdout.flush()
        
        user_id = message.from_user.id if message.from_user else None
        
        # Проверяем, не ожидает ли пользователь ввода кода админки
        from handlers.admin import _waiting_for_code
        if user_id and user_id in _waiting_for_code:
            return
        
        response = MENU_RESPONSES[button_text]
        
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Проверяем формат ответа (новый словарь или старая строка)
        if isinstance(response, dict):
            # Новый формат: текст -> фото -> текст после фото
            text_before = response.get("text_before_photo", "")
            photo_path = response.get("photo")
            text_after = response.get("text_after_photo", "")
            
            # Отправляем первый текст
            if text_before:
                if len(text_before) > 4096:
                    text_before = text_before[:4090] + "..."
                bot.send_message(
                    message.chat.id,
                    text_before,
                    reply_markup=get_main_keyboard()
                )
                print(f"[FALLBACK HANDLER] ✅ Первый текст отправлен", flush=True)
                sys.stdout.flush()
            
            # Отправляем фото
            if photo_path:
                full_photo_path = os.path.join(base_dir, photo_path)
                if os.path.exists(full_photo_path):
                    try:
                        with open(full_photo_path, 'rb') as photo:
                            bot.send_photo(
                                message.chat.id,
                                photo,
                                reply_markup=get_main_keyboard()
                            )
                        print(f"[FALLBACK HANDLER] ✅ Фото отправлено", flush=True)
                        sys.stdout.flush()
                    except Exception as photo_error:
                        print(f"[FALLBACK HANDLER] ⚠️ Ошибка при отправке фото: {photo_error}", flush=True)
                        sys.stdout.flush()
                else:
                    print(f"[FALLBACK HANDLER] ⚠️ Файл фото не найден: {full_photo_path}", flush=True)
                    sys.stdout.flush()
            
            # Отправляем текст после фото
            if text_after:
                if len(text_after) > 4096:
                    text_after = text_after[:4090] + "..."
                bot.send_message(
                    message.chat.id,
                    text_after,
                    reply_markup=get_main_keyboard()
                )
                print(f"[FALLBACK HANDLER] ✅ Текст после фото отправлен", flush=True)
                sys.stdout.flush()
        else:
            # Старый формат: просто текст
            response_text = response
            if len(response_text) > 4096:
                response_text = response_text[:4090] + "..."
            bot.send_message(
                message.chat.id,
                response_text,
                reply_markup=get_main_keyboard()
            )
            print(f"[FALLBACK HANDLER] ✅ Ответ отправлен", flush=True)
            sys.stdout.flush()
        
    except Exception as e:
        print(f"[FALLBACK HANDLER] Ошибка: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()


@bot.message_handler(commands=['көмек'])
def handle_help_command(message: types.Message):
    """Handle /көмек command (also available as button)"""
    user_id = message.from_user.id
    log_user_action(user_id, 'command', '/көмек')
    
    response_text = MENU_RESPONSES["Көмек және байланыс"]
    bot.reply_to(
        message,
        response_text,
        reply_markup=get_main_keyboard()
    )
