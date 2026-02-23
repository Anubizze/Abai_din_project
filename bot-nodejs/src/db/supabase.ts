/**
 * Supabase client initialization
 * Uses service role key for bot operations (read-only for menus/texts)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

// Service role client (for bot operations)
let serviceClient: SupabaseClient | null = null;

// Anon client (for public operations)
let anonClient: SupabaseClient | null = null;

/**
 * Get Supabase client with service role (full access)
 * Used by bot to read menus and texts
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return serviceClient;
}

/**
 * Get Supabase client with anon key (RLS enforced)
 * Used for operations that should respect RLS policies
 */
export function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return anonClient;
}

/**
 * Type definitions for database tables
 */
export interface User {
  id: string;
  telegram_id: number | null;
  email: string | null;
  role: 'admin' | 'manager' | 'user';
  full_name: string | null;
  preferred_lang: 'ru' | 'kz' | 'en' | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
}

export interface BotMenu {
  id: string;
  parent_id: string | null;
  type: 'menu' | 'button' | 'command';
  callback_data: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

export interface BotText {
  id: string;
  menu_id: string;
  lang: 'ru' | 'kz' | 'en';
  text: string | null;
  button_title: string | null;
  text_before_photo: string | null;
  text_after_photo: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAction {
  id: string;
  user_id: string | null;
  telegram_id: number | null;
  action_type: string;
  action_data: string | null;
  menu_id: string | null;
  created_at: string;
}
