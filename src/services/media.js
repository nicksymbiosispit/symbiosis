import { supabase } from './supabase.js';

export const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;

export function mediaEmbed(url) {
  if (!IMAGE_URL_PATTERN.test(url || '')) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'tenor.com' || host.endsWith('.tenor.com')) {
      const id = parsed.pathname.match(/(?:-|\/)(\d+)\/?$/)?.[1];
      if (id) return { type: 'frame', src: `https://tenor.com/embed/${id}` };
    }
    if (host === 'giphy.com' || host.endsWith('.giphy.com')) {
      const tail = parsed.pathname.split('/').filter(Boolean).pop() || '';
      const id = tail.match(/([A-Za-z0-9]+)$/)?.[1];
      if (id) return { type: 'frame', src: `https://giphy.com/embed/${id}` };
    }
    return { type: 'image', src: url };
  } catch {
    return null;
  }
}

export async function uploadRoomMedia(userId, file) {
  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  if (!allowed.includes(file?.type)) throw new Error('Choose a PNG, JPG, WebP, or GIF file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Room media must be 15 MB or smaller.');
  const extension=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const { error }=await supabase.storage.from('room-media').upload(path,file,{cacheControl:'3600',upsert:false});
  if(error)throw error;
  return supabase.storage.from('room-media').getPublicUrl(path).data.publicUrl;
}
