import {useCallback,useEffect,useState} from 'react';
import {supabase} from '../services/supabase.js';
import {attachProfiles} from '../services/profiles.js';

export function useCommunity(userId,isStaff=false){
  const [rooms,setRooms]=useState([]),[bulletins,setBulletins]=useState([]),[logs,setLogs]=useState([]),[actions,setActions]=useState([]),[status,setStatus]=useState('');
  const load=useCallback(async()=>{if(!supabase||!userId)return;try{
    const [roomResult,bulletinResult]=await Promise.all([supabase.from('rooms').select('*').order('is_builtin',{ascending:false}).order('created_at'),supabase.from('bulletins').select('*').order('created_at',{ascending:false}).limit(100)]);
    if(roomResult.error)throw roomResult.error;if(bulletinResult.error)throw bulletinResult.error;
    setRooms(roomResult.data||[]);setBulletins(await attachProfiles((bulletinResult.data||[]).map(row=>({...row,user_id:row.author_id}))));
    const actionResult=await supabase.from('moderation_actions').select('*').order('created_at',{ascending:false}).limit(200);if(actionResult.error)throw actionResult.error;setActions(actionResult.data||[]);
    if(isStaff){const logResult=await supabase.from('message_deletion_logs').select('*').order('deleted_at',{ascending:false}).limit(200);if(logResult.error)throw logResult.error;setLogs(logResult.data||[])}
  }catch(error){setStatus(error.message)}},[userId,isStaff]);
  useEffect(()=>{void load();if(!supabase||!userId)return;const channel=supabase.channel(`community-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'rooms'},load).on('postgres_changes',{event:'*',schema:'public',table:'bulletins'},load).on('postgres_changes',{event:'*',schema:'public',table:'message_deletion_logs'},()=>isStaff&&load()).subscribe();return()=>void supabase.removeChannel(channel)},[load,userId,isStaff]);
  async function run(query,success){setStatus('working…');const {error}=await query;if(error){setStatus(error.message);return false}setStatus(success);await load();return true}
  return {rooms,bulletins,logs,actions,status,reload:load,
    createRoom:data=>run(supabase.from('rooms').insert({...data,owner_id:userId}),'Room created.'),
    updateRoom:(slug,changes)=>run(supabase.from('rooms').update({...changes,updated_at:new Date().toISOString()}).eq('slug',slug),'Room updated.'),
    postBulletin:data=>run(supabase.from('bulletins').insert({...data,author_id:userId}),'Bulletin posted.'),
    deleteBulletin:id=>run(supabase.from('bulletins').delete().eq('id',id),'Bulletin deleted.'),
    updateTags:(profileId,tags)=>run(supabase.from('profiles').update({tags}).eq('id',profileId),'Tags updated.'),
    moderate:data=>run(supabase.from('moderation_actions').insert({...data,moderator_id:userId}),'Moderation action recorded.'),
    revokeAction:id=>run(supabase.from('moderation_actions').update({revoked_at:new Date().toISOString()}).eq('id',id),'Action revoked.')};
}
