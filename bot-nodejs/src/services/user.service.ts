/**
 * User Service
 * Handles user operations and tracking
 */

import { randomUUID } from 'crypto';
import { getServiceClient, User } from '../db/supabase';

export type BotLang = 'kz' | 'ru' | 'en';

type LogActionOptions = {
  sessionId?: string | null;
  responseTimeMs?: number | null;
  errorOccurred?: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  userLang?: BotLang | null;
  ipAddress?: string | null;
};

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes inactivity
const sessionMap = new Map<number, { id: string; lastSeen: number }>();

type TelegramProfile = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  is_bot?: boolean;
  is_fake?: boolean;
  is_scam?: boolean;
};

function resolveSessionId(telegramId: number, actionType: string, actionData?: string): string {
  const now = Date.now();
  const existing = sessionMap.get(telegramId);
  const isExpired = !existing || now - existing.lastSeen > SESSION_TTL_MS;
  const isStartCommand = actionType === 'command' && actionData === '/start';

  if (isExpired || isStartCommand) {
    const newId = randomUUID();
    sessionMap.set(telegramId, { id: newId, lastSeen: now });
    return newId;
  }

  sessionMap.set(telegramId, { id: existing.id, lastSeen: now });
  return existing.id;
}

/**
 * Get or create user by Telegram ID
 */
export async function getOrCreateUser(telegramId: number, username?: string, fullName?: string): Promise<User> {
  const supabase = getServiceClient();

  // Try to find existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (existingUser) {
    // Update last_seen_at
    await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existingUser.id);

    return existingUser;
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      full_name: fullName || username || null,
      role: 'user',
      preferred_lang: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return newUser;
}

async function loadUserAuditFields(telegramId: number) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('users')
    .select('data_verification, data_source')
    .eq('telegram_id', telegramId)
    .single();

  return {
    data_verification: (data?.data_verification as Record<string, unknown> | null) || {},
    data_source: (data?.data_source as Record<string, unknown> | null) || {},
  };
}

export async function updateUserTelegramMetadata(
  telegramId: number,
  profile: TelegramProfile,
  photoId?: string | null
): Promise<void> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data_verification, data_source } = await loadUserAuditFields(telegramId);

  const verificationUpdate = {
    ...data_verification,
    tg_username: { verified: true, at: now },
    tg_first_name: { verified: true, at: now },
    tg_last_name: { verified: true, at: now },
    tg_language_code: { verified: true, at: now },
    tg_is_premium: { verified: true, at: now },
    tg_is_bot: { verified: true, at: now },
    tg_is_fake: { verified: true, at: now },
    tg_is_scam: { verified: true, at: now },
    tg_photo_id: { verified: true, at: now },
  };

  const sourceUpdate = {
    ...data_source,
    tg_username: 'telegram',
    tg_first_name: 'telegram',
    tg_last_name: 'telegram',
    tg_language_code: 'telegram',
    tg_is_premium: 'telegram',
    tg_is_bot: 'telegram',
    tg_is_fake: 'telegram',
    tg_is_scam: 'telegram',
    tg_photo_id: 'telegram',
  };

  const { error } = await supabase
    .from('users')
    .update({
      tg_username: profile.username ?? null,
      tg_first_name: profile.first_name ?? null,
      tg_last_name: profile.last_name ?? null,
      tg_language_code: profile.language_code ?? null,
      tg_is_premium: profile.is_premium ?? null,
      tg_is_bot: profile.is_bot ?? null,
      tg_is_fake: profile.is_fake ?? null,
      tg_is_scam: profile.is_scam ?? null,
      tg_photo_id: photoId ?? null,
      data_verification: verificationUpdate,
      data_source: sourceUpdate,
      last_seen_at: now,
    })
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('Error updating Telegram metadata:', error);
  }
}

export async function updateUserPhone(
  telegramId: number,
  phoneNumber: string
): Promise<void> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data_verification, data_source } = await loadUserAuditFields(telegramId);

  const verificationUpdate = {
    ...data_verification,
    phone_number: { verified: true, at: now },
  };

  const sourceUpdate = {
    ...data_source,
    phone_number: 'telegram',
  };

  const { error } = await supabase
    .from('users')
    .update({
      phone_number: phoneNumber,
      data_verification: verificationUpdate,
      data_source: sourceUpdate,
      last_seen_at: now,
    })
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('Error updating phone number:', error);
  }
}

/**
 * Log user action
 */
export async function logUserAction(
  telegramId: number,
  actionType: string,
  actionData?: string,
  menuId?: string,
  options?: LogActionOptions
): Promise<void> {
  const supabase = getServiceClient();
  const sessionId = options?.sessionId ?? resolveSessionId(telegramId, actionType, actionData);

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  const { error } = await supabase
    .from('user_actions')
    .insert({
      user_id: user?.id || null,
      telegram_id: telegramId,
      action_type: actionType,
      action_data: actionData || null,
      menu_id: menuId || null,
      session_id: sessionId,
      response_time_ms: options?.responseTimeMs ?? null,
      error_occurred: options?.errorOccurred ?? false,
      error_message: options?.errorMessage ?? null,
      metadata: options?.metadata ?? {},
      user_lang: options?.userLang ?? null,
      ip_address: options?.ipAddress ?? null,
    });

  if (error) {
    console.error('Error logging user action:', error);
    // Don't throw - logging errors shouldn't break the bot
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(telegramId: number): Promise<boolean> {
  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('telegram_id', telegramId)
    .single();

  return user?.role === 'admin';
}

/**
 * Get user's preferred bot language
 */
export async function getUserPreferredLang(telegramId: number): Promise<BotLang | null> {
  const supabase = getServiceClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('preferred_lang')
    .eq('telegram_id', telegramId)
    .single();

  if (error) {
    // If user doesn't exist yet, return null (caller should fallback)
    return null;
  }

  return (user?.preferred_lang as BotLang | null) ?? null;
}

/**
 * Set user's preferred bot language
 */
export async function setUserPreferredLang(telegramId: number, lang: BotLang): Promise<void> {
  const supabase = getServiceClient();

  // Ensure user exists
  const user = await getOrCreateUser(telegramId);

  const { error } = await supabase
    .from('users')
    .update({
      preferred_lang: lang,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating preferred_lang:', error);
    throw error;
  }
}
