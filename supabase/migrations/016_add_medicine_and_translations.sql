-- ============================================
-- ADD MEDICINE MENU + RU/EN TRANSLATIONS
-- ============================================
-- Adds new top-level menu: menu_medicine
-- Seeds bot_texts for ru/en (from provided docs) and kz for medicine.
-- Does NOT overwrite existing kz content (except filling missing button_title).

-- 1) Add new menu item (top-level button)
INSERT INTO bot_menus (parent_id, type, callback_data, order_index, is_active)
VALUES (NULL, 'button', 'menu_medicine', 6, true)
ON CONFLICT (callback_data) DO UPDATE
SET is_active = true,
    order_index = EXCLUDED.order_index,
    type = EXCLUDED.type,
    parent_id = EXCLUDED.parent_id;

-- 2) Fill missing button_title for existing KZ rows (safe, only if empty)
UPDATE bot_texts t
SET button_title = CASE m.callback_data
  WHEN 'menu_din_info' THEN 'Дін деген не?'
  WHEN 'menu_din_laws' THEN 'заң'
  WHEN 'menu_danger_signs' THEN 'қауіп'
  WHEN 'menu_parents_advice' THEN 'ата-ана'
  WHEN 'menu_help_contact' THEN 'көмек'
  WHEN 'menu_medicine' THEN 'медицина'
  ELSE t.button_title
END
FROM bot_menus m
WHERE t.menu_id = m.id
  AND t.lang = 'kz'
  AND (t.button_title IS NULL OR btrim(t.button_title) = '')
  AND m.callback_data IN ('menu_din_info','menu_din_laws','menu_danger_signs','menu_parents_advice','menu_help_contact','menu_medicine');

-- Helper CTE for mapping callback_data → menu_id and copying photo fields from kz
WITH menu_map AS (
  SELECT id, callback_data FROM bot_menus
  WHERE callback_data IN (
    'menu_din_info','menu_din_laws','menu_danger_signs','menu_parents_advice','menu_help_contact','menu_medicine'
  )
),
kz_photo AS (
  SELECT
    m.callback_data,
    t.text_before_photo,
    t.text_after_photo,
    t.photo_url
  FROM menu_map m
  LEFT JOIN bot_texts t
    ON t.menu_id = m.id AND t.lang = 'kz'
)
-- 3) RU translations (upsert)
INSERT INTO bot_texts (menu_id, lang, button_title, text, text_before_photo, text_after_photo, photo_url)
SELECT
  m.id,
  v.lang,
  v.button_title,
  v.text,
  p.text_before_photo,
  p.text_after_photo,
  p.photo_url
FROM menu_map m
JOIN kz_photo p ON p.callback_data = m.callback_data
JOIN (
  VALUES
    ('menu_din_info'::text, 'ru'::text, 'религия'::text,
$$религия – краткая информация о религии

Что такое религия?
Религия — это система понимания человеком мира, смысла жизни и нравственных ценностей. Она основывается на вере, морали и духовном воспитании.

Основные цели религии:
- Воспитание доброты, терпения и ответственности
- Укрепление мира и взаимного уважения в обществе
- Сохранение духовных ценностей

Важно:
Религия — личный выбор человека. Казахстан — светское государство, где свобода совести и вероисповедания защищена законом.

Предупреждение:
Религия никогда не оправдывает насилие, ненависть или экстремизм.

Подпишитесь на наши страницы в социальных сетях и получайте полезную информацию:
Instagram:
https://www.instagram.com/antiterror_abai/?hl=ru&amp;g=5
https://www.instagram.com/dinisteri_abai_oblysy/?hl=ru&amp;g=5
https://www.instagram.com/din_abai_obl/?hl=ru
Telegram: https://t.me/religion_abai
Tiktok: https://www.tiktok.com/@cipr_abai?_r=1&amp;_t=ZM-931pELSiPet
@mail: cipr_semey@mail.ru$$),

    ('menu_din_laws'::text, 'ru'::text, 'закон'::text,
$$закон – законодательство в сфере религии

📌 Конституция Республики Казахстан (Основной закон) — обеспечивает свободу вероисповедания, свободу совести и принципы светского государства:
🔗 https://adilet.zan.kz/kaz/docs/K950001000_

📌 Закон Республики Казахстан «О религиозной деятельности и религиозных объединениях» (2011 г. № 483-IV) — определяет порядок религиозной деятельности, регистрации религиозных объединений, их правовой статус и регулирование:
🔗 https://adilet.zan.kz/kaz/docs/Z1100000483

📌 Правила оказания государственных услуг — устанавливают порядок и требования предоставления государственных услуг в сфере религиозной деятельности:
🔗 https://adilet.zan.kz/kaz/docs/V2000020256

📌 Закон «О нарушении законодательства Республики Казахстан о религиозной деятельности и религиозных объединениях» — устанавливает административную ответственность за несоблюдение требований законодательства в сфере религии:
🔗 https://adilet.zan.kz/kaz/docs/K1400000235#z490$$),

    ('menu_danger_signs'::text, 'ru'::text, 'опасность'::text,
$$опасность — признаки угроз и меры безопасности

⚠️ Признаки религиозной радикализации и деструктивного влияния

🚩 Разделяющая риторика
- «Только мы на правильном пути, остальные заблуждаются»
- Враждебное отношение к государству, закону и светской системе

🚩 Слепое подчинение
- Признание одного человека или группы носителями абсолютной истины
- Запрет на вопросы и сомнения

🚩 Изоляция от семьи и общества
- Побуждение к разрыву отношений с родными и друзьями
- Внушение мысли «они тебя не понимают»

🚩 Отрицание закона
- Распространение мнений о том, что государственные законы «против религии»
- Оправдание нарушений закона

🚩 Скрытая деятельность
- Закрытые чаты, тайные встречи
- Требование получать информацию только из «своих источников»

🚩 Оправдание насилия
- Представление конфликтов, ненависти и применения силы как «священного долга»

⚠️ Обратите внимание!
В целях предотвращения негативного влияния деструктивных религиозных течений в интернет-пространстве просим соблюдать следующие простые меры безопасности:

🚩 Ограничивайте доступ к личной информации: не публикуйте персональные данные, номер телефона, адрес, документы.
🚩 Не вступайте в сомнительные религиозные сообщества, приглашённые незнакомыми людьми: остерегайтесь закрытых чатов, групп и неизвестных страниц.
🚩 Будьте осторожны при переходе по ссылкам из сообщений от других пользователей: подозрительные сайты и материалы могут содержать экстремистский контент.
🚩 Не позволяйте другим управлять вашим сознанием: сохраняйте критическое мышление и проверяйте информацию только в официальных источниках.$$),

    ('menu_parents_advice'::text, 'ru'::text, 'родители'::text,
$$родители – памятка для родителей

Вы можете заметить влияние деструктивных религиозных течений на вашего ребёнка по следующим изменениям:
- равнодушие к семье и друзьям, снижение интереса к учёбе и обычным хобби;
- чрезмерная раздражительность по поводу обычных вещей и безразличие ко всему вокруг;
- частое использование религиозных терминов и цитат, которых раньше не было;
- изменения в привычках и одежде, замкнутость, значительное время, проведённое за чтением религиозной литературы.

Чтобы предотвратить вовлечение ребёнка, общайтесь с ним как можно чаще, станьте для него самым близким и доверенным другом.
Следите за интересами ребёнка в интернет-пространстве.

Будьте осторожны, берегите себя и своих близких!$$),

    ('menu_help_contact'::text, 'ru'::text, 'помощь'::text,
$$помощь – помощь теолога и психолога в сфере религии

Если вам нужна помощь теолога или психолога по вопросам религии, оставьте свой номер телефона: __

Подпишитесь на наши страницы в социальных сетях и получайте полезную информацию:
Instagram:
https://www.instagram.com/antiterror_abai/?hl=ru&amp;g=5
https://www.instagram.com/dinisteri_abai_oblysy/?hl=ru&amp;g=5
https://www.instagram.com/din_abai_obl/?hl=ru
Telegram: https://t.me/religion_abai
Tiktok: https://www.tiktok.com/@cipr_abai?_r=1&amp;_t=ZM-931pELSiPet
@mail: cipr_semey@mail.ru$$),

    ('menu_medicine'::text, 'ru'::text, 'медицина'::text,
$$медицина — медицина и религия

🩺 Почему обращение к медицинскому специалисту не противоречит религии?
🤝 Религия и медицина — не противоположные понятия. Их общая цель — сохранение жизни, здоровья и целостности человека как в духовном, так и в физическом плане.
👩‍⚕️👨‍⚕️ Обращение к врачу или психологу не является признаком слабости и не означает отказа от религии. Напротив, во многих религиозных традициях забота о теле и душе рассматривается как ответственность человека.
🧠 Физическое и психоэмоциональное состояние требует профессиональной помощи. Так же, как при переломе вы обращаетесь к врачу, при страхе, стрессах, депрессии или сильном напряжении важно получать поддержку квалифицированного специалиста.
💉🩸 Отказ от медицинского вмешательства, включая вакцинацию и переливание крови по религиозным мотивам, может создать серьёзную угрозу для жизни и здоровья. Во многих религиозных учениях сохранение жизни считается высшей ценностью.
🙏💊 Медицинская помощь не заменяет веру и духовные практики, а дополняет их. Духовная поддержка и лечение могут осуществляться параллельно.
⚠️ Искажённые религиозные представления и неправильные стереотипы могут привести к отказу от помощи, поставить здоровье под угрозу и сделать человека уязвимым к манипуляциям и радикальным идеям.
🌱 Забота о собственном здоровье — проявление уважения и ответственности за жизнь, дарованную человеку.$$)
) AS v(callback_data, lang, button_title, text)
  ON v.callback_data = m.callback_data
WHERE v.lang = 'ru'
ON CONFLICT (menu_id, lang) DO UPDATE SET
  button_title = EXCLUDED.button_title,
  text = EXCLUDED.text,
  text_before_photo = COALESCE(EXCLUDED.text_before_photo, bot_texts.text_before_photo),
  text_after_photo = COALESCE(EXCLUDED.text_after_photo, bot_texts.text_after_photo),
  photo_url = COALESCE(EXCLUDED.photo_url, bot_texts.photo_url);

-- 4) EN translations (upsert)
WITH menu_map AS (
  SELECT id, callback_data FROM bot_menus
  WHERE callback_data IN (
    'menu_din_info','menu_din_laws','menu_danger_signs','menu_parents_advice','menu_help_contact','menu_medicine'
  )
),
kz_photo AS (
  SELECT
    m.callback_data,
    t.text_before_photo,
    t.text_after_photo,
    t.photo_url
  FROM menu_map m
  LEFT JOIN bot_texts t
    ON t.menu_id = m.id AND t.lang = 'kz'
)
INSERT INTO bot_texts (menu_id, lang, button_title, text, text_before_photo, text_after_photo, photo_url)
SELECT
  m.id,
  v.lang,
  v.button_title,
  v.text,
  p.text_before_photo,
  p.text_after_photo,
  p.photo_url
FROM menu_map m
JOIN kz_photo p ON p.callback_data = m.callback_data
JOIN (
  VALUES
    ('menu_din_info'::text, 'en'::text, 'Religion'::text,
$$Religion — Brief Information about Religion

What is religion?
Religion is a system through which people understand the world, the meaning of life, and moral values. It is based on faith, morality, and spiritual development.

Main goals of religion:
- Promoting kindness, patience, and responsibility
- Strengthening peace and mutual respect in society
- Preserving spiritual values

Important:
Religion is a personal choice. Kazakhstan is a secular state where freedom of conscience and religion is protected by law.

Warning:
Religion never justifies violence, hatred, or extremism.

Follow our social media pages and stay informed with useful and up-to-date information:
Instagram:
https://www.instagram.com/antiterror_abai/?hl=ru&amp;g=5
https://www.instagram.com/dinisteri_abai_oblysy/?hl=ru&amp;g=5
https://www.instagram.com/din_abai_obl/?hl=ru
Telegram: https://t.me/religion_abai
Tiktok: https://www.tiktok.com/@cipr_abai?_r=1&amp;_t=ZM-931pELSiPet
@mail: cipr_semey@mail.ru$$),

    ('menu_din_laws'::text, 'en'::text, 'Law'::text,
$$Law — Legislation in the Field of Religion

📌 The Constitution of the Republic of Kazakhstan (Basic Law) — guarantees freedom of religion, freedom of conscience, and the principles of a secular state:
🔗 https://adilet.zan.kz/kaz/docs/K950001000_

📌 The Law of the Republic of Kazakhstan “On Religious Activity and Religious Associations” (2011, No. 483-IV) — defines the procedure for religious activities, registration of religious associations, their legal status, and regulation:
🔗 https://adilet.zan.kz/kaz/docs/Z1100000483

📌 Rules for the Provision of Public Services — establish the procedure and requirements for providing public services in the field of religious activity:
🔗 https://adilet.zan.kz/kaz/docs/V2000020256

📌 The Code on Administrative Offenses of the Republic of Kazakhstan — establishes administrative liability for violations of legislation on religious activity and religious associations:
🔗 https://adilet.zan.kz/kaz/docs/K1400000235#z490$$),

    ('menu_danger_signs'::text, 'en'::text, 'Danger'::text,
$$Danger — Signs of Threats and Safety Measures

Signs of Religious Radicalization and Destructive Influence

🚩 Divisive Rhetoric
- “Only we are on the right path; everyone else is misguided”
- Hostile attitudes toward the state, the law, and the secular system

🚩 Blind Obedience
- Recognition of one person or group as the sole bearer of absolute truth
- Prohibition of questions and doubts

🚩 Isolation from Family and Society
- Encouragement to cut ties with relatives and friends
- Instilling the idea that “they don’t understand you”

🚩 Rejection of the Law
- Spreading claims that state laws are “against religion”
- Justifying violations of the law

🚩 Secretive Activity
- Closed chats and secret meetings
- Demands to receive information only from “their own sources”

🚩 Justification of Violence
- Presenting conflict, hatred, and the use of force as a “sacred duty”

Pay attention!
To prevent the negative influence of destructive religious movements in the online space, please follow these simple safety measures:
- Limit access to personal information: do not publish personal data, phone numbers, addresses, or documents.
- Do not join suspicious religious communities invited by strangers: beware of closed chats, groups, and unknown pages.
- Be cautious when clicking links sent by other users: suspicious websites and materials may contain extremist content.
- Do not allow others to control your thinking: maintain critical thinking and verify information only through official sources.$$),

    ('menu_parents_advice'::text, 'en'::text, 'Parents'::text,
$$Parents — A Guide for Parents

You may notice the influence of destructive religious movements on your child through the following changes:
- Indifference toward family and friends, and a decline in interest in studies and usual hobbies;
- Excessive irritability over ordinary matters and apathy toward everything around them;
- Frequent use of religious terms and quotations that were not previously used;
- Changes in habits and clothing, social withdrawal, and spending a significant amount of time reading religious literature.

To prevent your child from becoming involved, communicate with them as often as possible and become their closest and most trusted friend.
Monitor your child’s interests and activities in the online space.

Be cautious and take care of yourself and your loved ones!$$),

    ('menu_help_contact'::text, 'en'::text, 'Support'::text,
$$Support — Theological and Psychological Assistance in Religious Matters

If you need help from a theologian or a psychologist on religious issues, please leave your phone number: __

Follow our social media pages and stay informed with useful and up-to-date information:
Instagram:
https://www.instagram.com/antiterror_abai/?hl=ru&amp;g=5
https://www.instagram.com/dinisteri_abai_oblysy/?hl=ru&amp;g=5
https://www.instagram.com/din_abai_obl/?hl=ru
Telegram: https://t.me/religion_abai
Tiktok: https://www.tiktok.com/@cipr_abai?_r=1&amp;_t=ZM-931pELSiPet
@mail: cipr_semey@mail.ru$$),

    ('menu_medicine'::text, 'en'::text, 'Medicine'::text,
$$Medicine — Medicine and Religion

Why seeking medical help does not contradict religion

Religion and medicine are not opposing concepts. Their shared goal is the preservation of life, health, and the integrity of the human being—both spiritually and physically.
Consulting a doctor or a psychologist is not a sign of weakness and does not mean abandoning religion. On the contrary, in many religious traditions, caring for both body and soul is considered a personal responsibility.
Physical and psycho-emotional conditions require professional assistance. Just as you see a doctor for a broken bone, it is important to seek qualified support for fear, stress, depression, or severe emotional strain.
Refusing medical treatment, including vaccination and blood transfusion, for religious reasons can pose a serious threat to life and health. In many religious teachings, preserving life is regarded as the highest value.
Medical care does not replace faith or spiritual practices—it complements them. Spiritual support and medical treatment can and should exist side by side.
Distorted religious beliefs and false stereotypes may lead to refusal of help, endanger health, and make a person vulnerable to manipulation and radical ideas.
Caring for one’s health is a sign of respect and responsibility for the life given to a person.$$)
) AS v(callback_data, lang, button_title, text)
  ON v.callback_data = m.callback_data
WHERE v.lang = 'en'
ON CONFLICT (menu_id, lang) DO UPDATE SET
  button_title = EXCLUDED.button_title,
  text = EXCLUDED.text,
  text_before_photo = COALESCE(EXCLUDED.text_before_photo, bot_texts.text_before_photo),
  text_after_photo = COALESCE(EXCLUDED.text_after_photo, bot_texts.text_after_photo),
  photo_url = COALESCE(EXCLUDED.photo_url, bot_texts.photo_url);

-- 5) KZ text for Medicine (if not exists)
WITH m AS (
  SELECT id FROM bot_menus WHERE callback_data = 'menu_medicine' LIMIT 1
)
INSERT INTO bot_texts (menu_id, lang, button_title, text)
SELECT
  m.id,
  'kz',
  'медицина',
$$Медицина – медицина және дін

Медицинаға жүгіну дінге қайшы емес.

Дін мен медицина бір-біріне қарсы ұғымдар емес. Екеуінің ортақ мақсаты — адам өмірін, денсаулығын және тұтастығын (рухани да, тәндік те) сақтау.

Дәрігерге немесе психологқа жүгіну әлсіздік белгісі емес және діннен бас тарту емес. Көптеген діни дәстүрлерде тән мен жанға қамқорлық — адамның жауапкершілігі.

Дене және психоэмоционалдық жағдай кәсіби көмекті қажет етеді. Қол сынғанда дәрігерге барғандай, қорқыныш, стресс, депрессия немесе қатты күйзеліс кезінде де білікті маманның қолдауы маңызды.

Діни себептермен емдеуден бас тарту (вакцинация, қан құю және т.б.) өмір мен денсаулыққа үлкен қауіп төндіруі мүмкін. Көптеген діни ілімдерде өмірді сақтау — ең жоғары құндылық.

Медициналық көмек сенімді немесе рухани тәжірибені алмастырмайды, керісінше толықтырады. Рухани қолдау мен ем қатар жүруі мүмкін.

Бұрмаланған діни түсініктер мен қате стереотиптер көмекке жүгінбеуге, денсаулыққа қауіп төндіруге және адамды манипуляция мен радикал идеяларға осал етуі мүмкін.

Өз денсаулығына қамқор болу — адамға берілген өмірге құрмет пен жауапкершілік.$$ AS text
FROM m
ON CONFLICT (menu_id, lang) DO NOTHING;

