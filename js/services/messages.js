import { initials, safeHtml, timeLabel } from '../utils/format.js';
import { supabase } from './supabase.js';

export function createMessageService({ messagesEl, messageCount }) {
  let cache = [];
  let channel = null;

  function render() {
    messageCount.textContent = `${cache.length} message${cache.length === 1 ? '' : 's'}`;
    if (!cache.length) {
      messagesEl.innerHTML = `<div class="empty-chat"><div><div style="font-size:28px">✦</div><strong>No messages yet.</strong><div>Be the first person to say something.</div></div></div>`;
      return;
    }

    messagesEl.innerHTML = cache.map((message) => `
      <article class="message">
        <div class="message-avatar">${safeHtml(initials(message.profile?.username || 'U'))}</div>
        <div><div class="message-head">
          <span class="message-user">${safeHtml(message.profile?.username || 'Unknown user')}</span>
          <span class="message-time">${safeHtml(timeLabel(message.created_at))}</span>
        </div><div class="message-body">${safeHtml(message.body)}</div></div>
      </article>`).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function loadProfiles(rows) {
    const ids = [...new Set(rows.map((row) => row.user_id))];
    if (!ids.length) return rows;
    const { data, error } = await supabase.from('profiles').select('id, username').in('id', ids);
    if (error) throw error;
    const profiles = new Map((data || []).map((profile) => [profile.id, profile]));
    return rows.map((row) => ({ ...row, profile: profiles.get(row.user_id) || { username: 'Unknown user' } }));
  }

  async function load() {
    if (!supabase) return;
    const { data, error } = await supabase.from('messages').select('id, user_id, body, created_at')
      .order('created_at', { ascending: true }).limit(100);
    if (error) throw error;
    cache = await loadProfiles(data || []);
    render();
  }

  function subscribe() {
    if (channel || !supabase) return;
    channel = supabase.channel('symbiosis-lobby')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: row }) => {
        if (cache.some((message) => message.id === row.id)) return;
        cache.push((await loadProfiles([row]))[0]);
        cache.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        if (cache.length > 100) cache = cache.slice(-100);
        render();
      }).subscribe();
  }

  async function reset() {
    if (channel && supabase) await supabase.removeChannel(channel);
    channel = null;
    cache = [];
    render();
  }

  return {
    render, load, subscribe, reset,
    send: (userId, body) => supabase.from('messages').insert({ user_id: userId, body })
  };
}
