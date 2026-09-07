import {useCallback,useEffect,useState} from 'react';
import {supabase} from '../services/supabase.js';
import {attachProfiles} from '../services/profiles.js';

export function useCommunity(userId,isStaff=false){
  const [rooms,setRooms]=useState([]),[bulletins,setBulletins]=useState([]),[logs,setLogs]=useState([]),[actions,setActions]=useState([]),[favorites,setFavorites]=useState([]),[events,setEvents]=useState([]),[status,setStatus]=useState('');
  const load=useCallback(async()=>{if(!supabase||!userId)return;try{
    const [roomResult,bulletinResult,favoriteResult,eventResult]=await Promise.all([supabase.from('rooms').select('*').order('is_builtin',{ascending:false}).order('created_at'),supabase.from('bulletins').select('*').order('created_at',{ascending:false}).limit(100),supabase.from('room_favorites').select('room_slug').eq('user_id',userId),supabase.from('site_events').select('*').order('starts_at',{ascending:false})]);
    if(roomResult.error)throw roomResult.error;if(bulletinResult.error)throw bulletinResult.error;
    if(favoriteResult.error)throw favoriteResult.error;if(eventResult.error)throw eventResult.error;
    setRooms(roomResult.data||[]);setFavorites((favoriteResult.data||[]).map(row=>row.room_slug));setEvents(eventResult.data||[]);setBulletins(await attachProfiles((bulletinResult.data||[]).map(row=>({...row,user_id:row.author_id}))));
    const actionResult=await supabase.from('moderation_actions').select('*').order('created_at',{ascending:false}).limit(200);if(actionResult.error)throw actionResult.error;setActions(actionResult.data||[]);
    if(isStaff){const logResult=await supabase.from('message_deletion_logs').select('*').order('deleted_at',{ascending:false}).limit(200);if(logResult.error)throw logResult.error;setLogs(logResult.data||[])}
  }catch(error){setStatus(error.message)}},[userId,isStaff]);
  useEffect(()=>{void load();if(!supabase||!userId)return;const channel=supabase.channel(`community-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'rooms'},load).on('postgres_changes',{event:'*',schema:'public',table:'bulletins'},load).on('postgres_changes',{event:'*',schema:'public',table:'room_favorites',filter:`user_id=eq.${userId}`},load).on('postgres_changes',{event:'*',schema:'public',table:'site_events'},load).on('postgres_changes',{event:'*',schema:'public',table:'message_deletion_logs'},()=>isStaff&&load()).subscribe();return()=>void supabase.removeChannel(channel)},[load,userId,isStaff]);
  async function run(query,success){setStatus('working…');const {error}=await query;if(error){setStatus(error.message);return false}setStatus(success);await load();return true}
  async function toggleFavorite(slug){const favorite=favorites.includes(slug);return run(favorite?supabase.from('room_favorites').delete().eq('user_id',userId).eq('room_slug',slug):supabase.from('room_favorites').insert({user_id:userId,room_slug:slug}),favorite?'Room removed from favorites.':'Room added to favorites.')}
  return {rooms,bulletins,logs,actions,favorites,events,status,reload:load,toggleFavorite,
    createRoom:data=>run(supabase.from('rooms').insert({...data,owner_id:userId}),'Room created.'),
    updateRoom:(slug,changes)=>run(supabase.from('rooms').update({...changes,updated_at:new Date().toISOString()}).eq('slug',slug),'Room updated.'),
    postBulletin:data=>run(supabase.from('bulletins').insert({...data,author_id:userId}),'Bulletin posted.'),
    deleteBulletin:id=>run(supabase.from('bulletins').delete().eq('id',id),'Bulletin deleted.'),
    updateTags:(profileId,tags)=>run(supabase.from('profiles').update({tags}).eq('id',profileId),'Tags updated.'),
    moderate:data=>run(supabase.from('moderation_actions').insert({...data,moderator_id:userId}),'Moderation action recorded.'),
    revokeAction:id=>run(supabase.from('moderation_actions').update({revoked_at:new Date().toISOString()}).eq('id',id),'Action revoked.'),
    createEvent:data=>run(supabase.from('site_events').insert({...data,created_by:userId}),'Site event scheduled.'),
    toggleEvent:(id,enabled)=>run(supabase.from('site_events').update({enabled}).eq('id',id),'Site event updated.'),
    deleteEvent:id=>run(supabase.from('site_events').delete().eq('id',id),'Site event deleted.')};
}
