import { $, $$ } from './js/utils/dom.js';
import { initials } from './js/utils/format.js';
import { configured, supabase } from './js/services/supabase.js';
import { ensureProfile } from './js/services/auth.js';
import { createMessageService } from './js/services/messages.js';
import { createModalController } from './js/components/modal.js';

const authCard = $('authCard');
const chatApp = $('chatApp');
const authStatus = $('authStatus');
const signOutBtn = $('signOutBtn');
const messageStatus = $('messageStatus');
const profileName = $('profileName');
const avatar = $('avatar');

let currentUser = null;
let currentProfile = null;

const messages = createMessageService({ messagesEl: $('messages'), messageCount: $('messageCount') });

function setStatus(element, message, good = false) {
  element.textContent = message || '';
  element.style.color = good ? '#1d7a38' : '#aa3a00';
}

const setAuthStatus = (message, good = false) => setStatus(authStatus, message, good);
const setMessageStatus = (message, good = false) => setStatus(messageStatus, message, good);

async function enterApp(user) {
  currentUser = user;
  currentProfile = await ensureProfile(user);
  profileName.textContent = currentProfile.username;
  avatar.textContent = initials(currentProfile.username);
  authCard.hidden = true;
  chatApp.hidden = false;
  signOutBtn.hidden = false;
  await messages.load();
  messages.subscribe();
}

async function leaveApp() {
  await messages.reset();
  currentUser = null;
  currentProfile = null;
  chatApp.hidden = true;
  authCard.hidden = false;
  signOutBtn.hidden = true;
}

async function startAuth() {
  if (!configured) {
    setAuthStatus('Add your Supabase URL and publishable key in js/config.js to activate the site.');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    try { await enterApp(session.user); }
    catch (error) { setAuthStatus(error.message || 'Could not load your account.'); }
  }

  supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    if (nextSession?.user && !currentUser) {
      try { await enterApp(nextSession.user); }
      catch (error) { setAuthStatus(error.message || 'Could not load your account.'); }
    } else if (!nextSession && currentUser) {
      await leaveApp();
    }
  });
}

$('signInForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setAuthStatus('Supabase is not configured yet. Open js/config.js and add your keys.');
  setAuthStatus('Signing you in…', true);
  const { error } = await supabase.auth.signInWithPassword({
    email: $('loginEmail').value.trim(), password: $('loginPassword').value
  });
  setAuthStatus(error ? error.message : 'Signed in!', !error);
});

$('signUpForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return setAuthStatus('Supabase is not configured yet. Open js/config.js and add your keys.');
  const username = $('signupUsername').value.trim();
  if (username.length < 2) return setAuthStatus('Username must be at least 2 characters.');
  setAuthStatus('Creating your account…', true);

  const { data, error } = await supabase.auth.signUp({
    email: $('signupEmail').value.trim(),
    password: $('signupPassword').value,
    options: { data: { username } }
  });
  if (error) return setAuthStatus(error.message);
  if (!data.session) return setAuthStatus('Account created! Check your email to confirm it, then sign in.', true);

  try {
    await ensureProfile(data.user, username);
    setAuthStatus('Welcome to Symbiosis!', true);
  } catch (profileError) {
    setAuthStatus(profileError.message || 'Account created, but your profile could not be saved.');
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
  const { error } = await messages.send(currentUser.id, body);
  input.disabled = false;
  if (error) return setMessageStatus(error.message);

  input.value = '';
  setMessageStatus('sent!', true);
  input.focus();
  setTimeout(() => setMessageStatus(''), 900);
});

$('messageInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('messageForm').requestSubmit();
  }
});

$$('.tiny-tool').forEach((button) => {
  button.addEventListener('click', () => {
    const input = $('messageInput');
    input.value += (input.value && !input.value.endsWith(' ') ? ' ' : '') + button.dataset.insert;
    input.focus();
  });
});

signOutBtn.addEventListener('click', async () => { if (supabase) await supabase.auth.signOut(); });

createModalController();
messages.render();
startAuth();
