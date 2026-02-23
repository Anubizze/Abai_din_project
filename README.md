# Abai Telegram Bot - Production Ready

Production-ready Telegram bot with Supabase backend and Admin Panel.

## 🏗️ Architecture

```
┌─────────────────┐
│  Telegram Bot   │ ← Reads menus/texts from Supabase
│   (Node.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │ ← Single source of truth
│   (PostgreSQL)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Admin Panel    │ ← CRUD operations (Admin only)
│   (Next.js)     │
└─────────────────┘
```

## 📁 Project Structure

```
.
├── bot-nodejs/              # Telegram bot (Node.js + TypeScript)
│   ├── src/
│   │   ├── bot/            # Bot handlers
│   │   ├── db/             # Supabase client
│   │   ├── services/      # Business logic
│   │   └── config/        # Configuration
│   └── package.json
│
├── admin-panel/            # Admin web interface (Next.js)
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   └── package.json
│
└── supabase/
    └── migrations/         # SQL migrations
        ├── 001_initial_schema.sql
        └── 002_seed_initial_data.sql
```

## 🚀 Quick Start

### 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Run migrations:

```bash
# In Supabase Dashboard → SQL Editor, run:
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_initial_data.sql
```

3. Create Storage bucket for photos:
   - Go to Supabase Dashboard → Storage
   - Click "Create Bucket"
   - Name: `bot-assets`
   - Public: Yes (or configure RLS policies)
   - Click "Create bucket"

4. Get your credentials:
   - Project URL
   - `anon` key (for admin panel)
   - `service_role` key (for bot - KEEP SECRET!)

### 2. Telegram Bot Setup

1. Get bot token from @BotFather
2. Configure environment:

```bash
cd bot-nodejs
cp .env.example .env
# Edit .env with your credentials
```

3. Install and run:

```bash
npm install
npm run dev  # Development
# or
npm run build && npm start  # Production
```

### 3. Admin Panel Setup

1. Configure environment:

```bash
cd admin-panel
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

2. Install and run:

```bash
npm install
npm run dev  # Development
# or
npm run build && npm start  # Production
```

3. Create admin user:
   - Go to Supabase Dashboard → Authentication
   - Create a new user
   - In SQL Editor, update user role:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

4. Login at `http://localhost:3000/login`

## 🔐 Security Features

### Row Level Security (RLS)

- ✅ All tables have RLS enabled
- ✅ Bot uses `service_role` key (read-only for menus)
- ✅ Admin panel uses `anon` key (RLS enforced)
- ✅ Only admins can modify data

### Authentication

- ✅ Supabase Auth for admin panel
- ✅ Role-based access control (admin/manager/user)
- ✅ Protected routes with middleware
- ✅ Session management

### Best Practices

- ✅ All secrets in `.env` files
- ✅ Never commit `.env` files
- ✅ Service role key only on backend
- ✅ Audit logging for all admin actions

## 📊 Database Schema

### Tables

- `users` - User accounts (Telegram + Admin)
- `bot_menus` - Menu structure (hierarchical)
- `bot_texts` - Multilingual content
- `user_actions` - Bot usage tracking
- `audit_logs` - Admin action logs
- `bot_settings` - Global bot configuration

### Key Features

- Hierarchical menus (parent/child)
- Multi-language support (ru/kz/en)
- Photo support (via `photo_url`)
- Ordering (`order_index`)
- Active/inactive toggle

## 🎯 Admin Panel Features

- ✅ Login with Supabase Auth
- ✅ View all menus
- ✅ Toggle menu active/inactive
- ✅ Create new menus and buttons
- ✅ Edit menu content with separate fields for text and buttons
- ✅ Upload photos from local computer to Supabase Storage
- ✅ Manage button order with up/down controls
- ✅ Multi-language editor (KZ, RU, EN)
- ✅ Separate sections for text/photo and buttons management

## 🤖 Bot Features

- ✅ Dynamic menu loading from Supabase
- ✅ Inline keyboard generation
- ✅ Multi-language support
- ✅ User tracking
- ✅ Action logging
- ✅ Photo support (via URLs)

## 📝 Managing Bot Content

### Via Admin Panel

1. Login at `/admin`
2. View all menus
3. Click "Edit" to modify content
4. Changes are reflected immediately (cache refreshes every 5 min)

### Via Supabase Dashboard

1. Go to Table Editor
2. Edit `bot_menus` for structure
3. Edit `bot_texts` for content
4. Changes take effect after cache refresh

### Via SQL

```sql
-- Add new menu
INSERT INTO bot_menus (type, callback_data, order_index, is_active)
VALUES ('button', 'menu_new_item', 6, true);

-- Add text for menu
INSERT INTO bot_texts (menu_id, lang, text)
VALUES ('menu-uuid-here', 'kz', 'Your text here');
```

## 🔄 Deployment

### Bot (Node.js)

**Recommended: Railway / Render / Fly.io**

```bash
# Set environment variables:
TELEGRAM_BOT_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...

# Build and start
npm run build
npm start
```

### Admin Panel (Next.js)

**Recommended: Vercel / Netlify**

1. Connect your Git repository
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

## 🛠️ Development

### Bot

```bash
cd bot-nodejs
npm run dev  # Watch mode with tsx
npm run type-check  # TypeScript check
```

### Admin Panel

```bash
cd admin-panel
npm run dev  # Next.js dev server
npm run lint  # ESLint
```

## 📚 API Reference

### Bot Service Functions

```typescript
// Get all active menus
getActiveMenus(): Promise<MenuTree[]>

// Get menu by callback
getMenuByCallback(callback: string): Promise<MenuWithTexts | null>

// Get menu text in language
getMenuText(menu: MenuWithTexts, lang: 'ru' | 'kz' | 'en'): BotText | null>

// Clear cache
clearMenuCache(): void
```

## 🔍 Troubleshooting

### Bot not responding

1. Check bot token in `.env`
2. Check Supabase connection
3. Verify menus exist and are active
4. Check bot logs

### Admin panel access denied

1. Verify user exists in `users` table
2. Check `role = 'admin'`
3. Clear browser cache/cookies
4. Check Supabase RLS policies

### Menus not updating

- Cache refreshes every 5 minutes
- Call `clearMenuCache()` to force refresh
- Check `is_active = true` in database

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request

## 📞 Support

For issues and questions, please open an issue on GitHub.
