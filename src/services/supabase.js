import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../config.js';

export const isConfigured = !SUPABASE_URL.includes('PASTE_') && !SUPABASE_KEY.includes('PASTE_');
export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
