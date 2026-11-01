import { useEffect, useId, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { searchProfiles } from '../services/profiles.js';

export default function UserSearch({ currentUserId, friendsApi, blockedIds = [], onViewProfile }) {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showFriendStatus, setShowFriendStatus] = useState(false);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const root = useRef(null);
  const input = useRef(null);
  const resultsId = useId();

  useEffect(() => {
    const term = query.trim();
    setError('');
    setNotice('');
    setShowFriendStatus(false);
    if (!term) { setPeople([]); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchProfiles(term, currentUserId, controller.signal);
        if (!controller.signal.aborted) setPeople(results);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Could not search users. Try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, currentUserId]);

  useEffect(() => {
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  async function friend(person, relationship) {
    setBusyId(person.id);
    setShowFriendStatus(true);
    setNotice('');
    try {
      const incoming = relationship?.status === 'pending' && relationship.addressee_id === currentUserId;
      if (relationship?.status === 'declined' && !await friendsApi.remove(relationship.id)) return;
      const ok = incoming ? await friendsApi.accept(relationship.id) : await friendsApi.request(person.id);
      if (ok) setNotice(incoming ? 'Friend request accepted.' : 'Friend request sent.');
    } catch (err) { setNotice(err.message || 'Could not update friendship. Try again.'); }
    finally { setBusyId(null); }
  }

  const visible = people.filter(person => person.id !== currentUserId && !blockedIds.includes(person.id));
  const expanded = open && Boolean(query.trim());
  return <div className="user-search" ref={root} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); input.current?.focus(); setOpen(false); }
  }}>
    <input ref={input} type="search" aria-label="Search users" placeholder="Search users…" maxLength={24} autoComplete="off" spellCheck={false}
      aria-expanded={expanded} aria-controls={expanded ? resultsId : undefined}
      value={query} onFocus={() => setOpen(true)} onChange={event => {
        setQuery(event.target.value); setPeople([]); setLoading(Boolean(event.target.value.trim())); setOpen(true);
      }} onKeyDown={event => {
        if (event.key === 'ArrowDown' && expanded) {
          event.preventDefault(); root.current?.querySelector('.search-results button')?.focus();
        }
      }}/>
    {expanded && <section id={resultsId} className="search-results" aria-label="User search results" aria-busy={loading}>
      <div className="search-heading">Find your people</div>
      <div className="search-status" role="status">{loading ? 'Searching…' : error || notice || (showFriendStatus ? friendsApi.status : '') || (!visible.length ? 'No users found.' : `${visible.length} result${visible.length === 1 ? '' : 's'}`)}</div>
      {!loading && !error && <ul>{visible.map(person => {
        const relationship = friendsApi.relationshipFor(person.id);
        const accepted = relationship?.status === 'accepted';
        const incoming = relationship?.status === 'pending' && relationship.addressee_id === currentUserId;
        const outgoing = relationship?.status === 'pending' && !incoming;
        return <li key={person.id}>
          <button type="button" className="search-person" onClick={() => { setOpen(false); onViewProfile(person); }}>
            <span className="search-avatar" aria-hidden="true"><Avatar profile={person}/></span><span><b>{person.username}</b><small>View profile</small></span>
          </button>
          {accepted || outgoing ? <span className="search-relationship">{accepted ? '✓ Friends' : 'Request sent'}</span> :
            <button type="button" className="tiny-tool search-friend" disabled={Boolean(busyId)} onClick={() => void friend(person, relationship)}>
              {busyId === person.id ? 'Working…' : incoming ? 'Accept request' : '+ Add friend'}
            </button>}
        </li>;
      })}</ul>}
    </section>}
  </div>;
}
