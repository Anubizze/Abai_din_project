/**
 * Main entry point
 */

import { startBot } from './bot';
import { config } from './config';

async function main() {
  console.log('🚀 Starting Abai Telegram Bot...');
  console.log(`Environment: ${config.app.env}`);
  
  // Validate config
  if (!config.telegram.token) {
    console.error('❌ TELEGRAM_BOT_TOKEN is required');
    process.exit(1);
  }

  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    console.error('❌ Supabase configuration is required');
    process.exit(1);
  }

  // Start bot
  await startBot();
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
