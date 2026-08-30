import { useCallback, useEffect, useState } from 'react';
import { listProfiles } from '../services/profiles.js';

export function usePeople(userId) {
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState('');
  const reload = useCallback(async () => {
    if (!userId) return;
    try { setPeople(await listProfiles(userId)); }
    catch (error) { setStatus(error.message); }
  }, [userId]);
  useEffect(() => { reload(); }, [reload]);
  return { people, status, reload };
}
