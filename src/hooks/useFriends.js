import { useCallback, useEffect, useMemo, useState } from 'react';
import { answerFriendRequest, loadFriendships, removeFriendship, requestFriend } from '../services/friends.js';
import { supabase } from '../services/supabase.js';

export function useFriends(userId, people) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const reload = useCallback(async () => {
    if (!userId) return;
    try { setRows(await loadFriendships(userId)); } catch (error) { setStatus(error.message); }
  }, [userId]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!userId || !supabase) return undefined;
    const channel = supabase.channel(`friendships-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => void reload())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [reload, userId]);
  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const relationshipFor = useCallback((personId) => rows.find((row) =>
    (row.requester_id === userId && row.addressee_id === personId) ||
    (row.addressee_id === userId && row.requester_id === personId)), [rows, userId]);
  const friends = useMemo(() => rows.filter((row) => row.status === 'accepted').map((row) => byId.get(row.requester_id === userId ? row.addressee_id : row.requester_id)).filter(Boolean), [byId, rows, userId]);
  const incoming = useMemo(() => rows.filter((row) => row.status === 'pending' && row.addressee_id === userId).map((row) => ({ ...row, person: byId.get(row.requester_id) })).filter((row) => row.person), [byId, rows, userId]);
  async function act(action) { try { setStatus('working…'); await action(); await reload(); setStatus(''); } catch (error) { setStatus(error.message); } }
  return {
    rows, friends, incoming, status, relationshipFor,
    request: (personId) => act(() => requestFriend(userId, personId)),
    accept: (id) => act(() => answerFriendRequest(id, 'accepted')),
    decline: (id) => act(() => removeFriendship(id)),
    remove: (id) => act(() => removeFriendship(id)), reload
  };
}
