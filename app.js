/*
  SYMBIOSIS CONFIG
  1) Create a Supabase project.
  2) Run supabase.sql in the SQL Editor.
  3) Paste your Project URL and publishable/anon key below.
*/
const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE';

const configured = !SUPABASE_URL.includes('PASTE_') && !SUPABASE_KEY.includes('PASTE_');
const { createClient } = window.supabase;
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const $ = (id) => document.getElementById(id);
const authCard = $('authCard');
const chatApp = $('chatApp');
const authStatus = $('authStatus');
const signOutBtn = $('signOutBtn');
const messagesEl = $('messages');
const messageCount = $('messageCount');
const messageStatus = $('messageStatus');
const profileName = $('profileName');
const avatar = $('avatar');

let currentUser = null;
let currentProfile = null;
let channel = null;
let messagesCache = [];

function setAuthStatus(message, good = false) {
  authStatus.textContent = message || '';
  authStatus.style.color = good ? '#1d7a38' : '#aa3a00';
}

function setMessageStatus(message, good = false) {
  messageStatus.textContent = message || '';
  messageStatus.style.color = good ? '#1d7a38' : '#aa3a00';
}

function initials(name = '?') {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

function safeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function timeLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderMessages() {
  messageCount.textContent = `${messagesCache.length} message${messagesCache.length === 1 ? '' : 's'}`;
  if (!messagesCache.length) {
    messagesEl.innerHTML = `
      <div class="empty-chat">
        <div>
          <div style="font-size:28px">✦</div>
          <strong>No messages yet.</strong>
          <div>Be the first person to say something.</div>
        </div>
      </div>`;
    return;
  }

  messagesEl.innerHTML = messagesCache.map((m) => `
    <article class="message">
      <div class="message-avatar">${safeHtml(initials(m.profile?.username || 'U'))}</div>
      <div>
        <div class="message-head">
          <span class="message-user">${safeHtml(m.profile?.username || 'Unknown user')}</span>
          <span class="message-time">${safeHtml(timeLabel(m.created_at))}</span>
        </div>
        <div class="message-body">${safeHtml(m.body)}</div>
      </div>
    </article>`).join('');

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadProfiles(rows) {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (!ids.length) return rows;
  const { data, error } = await supabase.from('profiles').select('id, username').in('id', ids);
  if (error) throw error;
  const map = new Map((data || []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, profile: map.get(r.user_id) || { username: 'Unknown user' } }));
}

async function loadMessages() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('messages')
    .select('id, user_id, body, created_at')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  messagesCache = await loadProfiles(data || []);
  renderMessages();
}

function subscribeToMessages() {
  if (channel || !supabase) return;
  channel = supabase
    .channel('symbiosis-lobby')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
      const row = payload.new;
      if (messagesCache.some((m) => m.id === row.id)) return;
      const enriched = (await loadProfiles([row]))[0];
      messagesCache.push(enriched);
      messagesCache.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      if (messagesCache.length > 100) messagesCache = messagesCache.slice(-100);
      renderMessages();
    })
    .subscribe();
}

async function ensureProfile(user, usernameFromSignup = null) {
  const { data, error } = await supabase.from('profiles').select('id, username').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const requested = usernameFromSignup || user.user_metadata?.username || `user${user.id.slice(0, 6)}`;
  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, username: requested })
    .select('id, username')
    .single();
  if (insertError) throw insertError;
  return inserted;
}

async function enterApp(user) {
  currentUser = user;
  currentProfile = await ensureProfile(user);
  profileName.textContent = currentProfile.username;
  avatar.textContent = initials(currentProfile.username);
  authCard.hidden = true;
  chatApp.hidden = false;
  signOutBtn.hidden = false;
  await loadMessages();
  subscribeToMessages();
}

async function leaveApp() {
  if (channel && supabase) {
    await supabase.removeChannel(channel);
  }
  channel = null;
  currentUser = null;
  currentProfile = null;
  messagesCache = [];
  chatApp.hidden = true;
  authCard.hidden = false;
  signOutBtn.hidden = true;
  renderMessages();
}

async function handleConfigured() {
  if (!configured) {
    setAuthStatus('Add your Supabase URL and publishable key in app.js to activate the site.');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    try {
      await enterApp(session.user);
    } catch (error) {
      setAuthStatus(error.message || 'Could not load your account.');
    }
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user && !currentUser) {
      try {
        await enterApp(session.user);
      } catch (error) {
        setAuthStatus(error.message || 'Could not load your account.');
      }
    } else if (!session && currentUser) {
      await leaveApp();
    }
  });
}

$('signInForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setAuthStatus('Supabase is not configured yet. Open app.js and add your keys.');
  setAuthStatus('Signing you in…', true);
  const { error } = await supabase.auth.signInWithPassword({
    email: $('loginEmail').value.trim(),
    password: $('loginPassword').value
  });
  if (error) setAuthStatus(error.message);
  else setAuthStatus('Signed in!', true);
});

$('signUpForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setAuthStatus('Supabase is not configured yet. Open app.js and add your keys.');
  const username = $('signupUsername').value.trim();
  if (username.length < 2) return setAuthStatus('Username must be at least 2 characters.');
  setAuthStatus('Creating your account…', true);

  const { data, error } = await supabase.auth.signUp({
    email: $('signupEmail').value.trim(),
    password: $('signupPassword').value,
    options: { data: { username } }
  });

  if (error) return setAuthStatus(error.message);
  if (!data.session) {
    setAuthStatus('Account created! Check your email to confirm it, then sign in.', true);
  } else {
    try {
      await ensureProfile(data.user, username);
      setAuthStatus('Welcome to Symbiosis!', true);
    } catch (profileError) {
      setAuthStatus(profileError.message || 'Account created, but your profile could not be saved.');
    }
  }
});

$('messageForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase || !currentUser) return;
  const input = $('messageInput');
  const body = input.value.trim();
  if (!body) return;
  if (body.length > 500) return setMessageStatus('Keep messages under 500 characters.');

  input.disabled = true;
  setMessageStatus('sending…', true);
  const { error } = await supabase.from('messages').insert({ user_id: currentUser.id, body });
  input.disabled = false;
  if (error) {
    setMessageStatus(error.message);
  } else {
    input.value = '';
    setMessageStatus('sent!', true);
    input.focus();
    setTimeout(() => setMessageStatus(''), 900);
  }
});

$('messageInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('messageForm').requestSubmit();
  }
});

document.querySelectorAll('.tiny-tool').forEach((button) => {
  button.addEventListener('click', () => {
    const input = $('messageInput');
    input.value += (input.value && !input.value.endsWith(' ') ? ' ' : '') + button.dataset.insert;
    input.focus();
  });
});

signOutBtn.addEventListener('click', async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
});

$('helpLink').addEventListener('click', (event) => {
  event.preventDefault();
  $('modalTitle').textContent = 'Symbiosis Help';
  $('modalText').textContent = 'Create an account or sign in, then type a message in #lobby. Messages appear live for everyone who is connected.';
  $('infoModal').hidden = false;
});

$('rulesLink').addEventListener('click', (event) => {
  event.preventDefault();
  $('modalTitle').textContent = 'Community Rules';
  $('modalText').textContent = 'Be decent, do not spam, and do not share private information. This starter intentionally keeps moderation simple; add reporting and moderation tools before opening it to a large public audience.';
  $('infoModal').hidden = false;
});

$('modalClose').addEventListener('click', () => { $('infoModal').hidden = true; });
$('infoModal').addEventListener('click', (event) => { if (event.target === $('infoModal')) $('infoModal').hidden = true; });

renderMessages();
handleConfigured();
