import { SUPABASE_KEY, SUPABASE_URL } from '../config.js';

export const configured = !SUPABASE_URL.includes('PASTE_') && !SUPABASE_KEY.includes('PASTE_');
export const supabase = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
