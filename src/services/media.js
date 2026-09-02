import { supabase } from './supabase.js';

export const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S*)?$/i;

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
