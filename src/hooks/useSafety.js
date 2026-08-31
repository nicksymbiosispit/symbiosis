import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase.js';

export function useSafety(userId, isModerator = false) {
  const [blocks, setBlocks] = useState([]);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('');

  const loadBlocks = useCallback(async () => {
    if (!supabase || !userId) return setBlocks([]);
    const { data, error } = await supabase.from('blocks').select('*').eq('blocker_id', userId);
    if (error) setStatus(error.message); else setBlocks(data || []);
  }, [userId]);

  const loadReports = useCallback(async () => {
    if (!supabase || !userId || !isModerator) return setReports([]);
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return setStatus(error.message);
    const rows = data || [];
    const profileIds = [...new Set(rows.flatMap(r => [r.reporter_id, r.reported_user_id]).filter(Boolean))];
    const messageIds = [...new Set(rows.map(r => r.message_id).filter(Boolean))];
    const [{ data: profiles }, { data: messages }] = await Promise.all([
      profileIds.length ? supabase.from('profiles').select('id,username').in('id', profileIds) : { data: [] },
      messageIds.length ? supabase.from('messages').select('id,body').in('id', messageIds) : { data: [] }
    ]);
    const names = new Map((profiles || []).map(p => [p.id, p.username]));
    const bodies = new Map((messages || []).map(m => [m.id, m.body]));
    setReports(rows.map(r => ({ ...r, reporter_name: names.get(r.reporter_id) || 'Unknown', reported_name: names.get(r.reported_user_id) || 'Unknown', message_body: bodies.get(r.message_id) || '' })));
  }, [isModerator, userId]);

  useEffect(() => { void loadBlocks(); void loadReports(); }, [loadBlocks, loadReports]);
  useEffect(() => {
    if (!supabase || !userId) return undefined;
    const channel = supabase.channel(`safety-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks', filter: `blocker_id=eq.${userId}` }, loadBlocks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => { if (isModerator) void loadReports(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isModerator, loadBlocks, loadReports, userId]);

  const blockedIds = useMemo(() => blocks.map(b => b.blocked_id), [blocks]);
  async function run(action, success) { try { setStatus('working…'); const { error } = await action(); if (error) throw error; setStatus(success); await loadBlocks(); await loadReports(); return true; } catch (error) { setStatus(error.message); return false; } }
  return {
    blocks, blockedIds, reports, status,
    isBlocked: id => blockedIds.includes(id),
    block: id => run(() => supabase.from('blocks').insert({ blocker_id: userId, blocked_id: id }), 'User blocked.'),
    unblock: id => run(() => supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', id), 'User unblocked.'),
    report: ({ userId: reportedUserId = null, messageId = null, reason }) => run(() => supabase.from('reports').insert({ reporter_id: userId, reported_user_id: reportedUserId, message_id: messageId, reason: reason.trim() }), 'Report sent to moderators.'),
    review: (id, reportStatus) => run(() => supabase.from('reports').update({ status: reportStatus, reviewed_at: new Date().toISOString(), reviewed_by: userId }).eq('id', id), 'Report updated.'),
    deleteMessage: id => run(() => supabase.from('messages').delete().eq('id', id), 'Message removed.'),
    reloadReports: loadReports
  };
}
