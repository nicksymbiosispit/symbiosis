import { useEffect, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import ProfileSidebar from './components/ProfileSidebar.jsx';
import ChatRoom from './components/ChatRoom.jsx';
import InfoModal from './components/InfoModal.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useMessages } from './hooks/useMessages.js';
import { usePeople } from './hooks/usePeople.js';
import DirectMessages from './components/DirectMessages.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import { useFriends } from './hooks/useFriends.js';
import { useLobbySettings } from './hooks/useLobbySettings.js';
import { useSafety } from './hooks/useSafety.js';
import ModeratorPanel from './components/ModeratorPanel.jsx';
import ReportDialog from './components/ReportDialog.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import { usePresence } from './hooks/usePresence.js';

const INFO = {
  help: { title: 'Symbiosis Help', text: 'Create an account or sign in, then post a message in #lobby. New messages appear live for everyone connected.' },
  rules: { title: 'Community Rules', text: 'Be decent. No harassment, threats, hate, impersonation, spam, sexual exploitation, or sharing private information. Use report and block when something is wrong; moderators may remove content and restrict abusive accounts.' }
};

export default function App() {
  const auth = useAuth();
  const people = usePeople(auth.user?.id);
  const friends = useFriends(auth.user?.id, people.people);
  const moderator = auth.profile?.role === 'moderator';
  const safety = useSafety(auth.user?.id, moderator);
  const [view, setView] = useState(()=>{const value=new URLSearchParams(window.location.search).get('room');return ['lobby','random','nostalgia'].includes(value)?value:'lobby'});
  const [targetMessageId, setTargetMessageId] = useState(()=>new URLSearchParams(window.location.search).get('message'));
  const room = ['lobby','random','nostalgia'].includes(view) ? view : 'lobby';
  const chat = useMessages(auth.user, safety.blockedIds, room, auth.profile?.username || '', targetMessageId);
  const presence = usePresence(auth.user, auth.profile);
  const settings = useLobbySettings(auth.user?.id);
  const [modal, setModal] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const navigate = (nextView) => { setView(nextView); setTargetMessageId(null); const url=new URL(window.location.href); url.searchParams.delete('room'); url.searchParams.delete('message'); window.history.replaceState({},'',url); if (nextView !== 'profile') setSelectedPerson(null); };
  const jumpToMessage = (nextRoom, messageId) => { if(!['lobby','random','nostalgia'].includes(nextRoom))return;setView(nextRoom);setTargetMessageId(String(messageId));setSelectedPerson(null);const url=new URL(window.location.href);url.searchParams.set('room',nextRoom);url.searchParams.set('message',messageId);window.history.pushState({},'',url); };
  useEffect(()=>{const restore=()=>{const params=new URLSearchParams(window.location.search);const nextRoom=params.get('room');setView(['lobby','random','nostalgia'].includes(nextRoom)?nextRoom:'lobby');setTargetMessageId(params.get('message'))};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore)},[]);
  return <>
    <div className="ascii-skull-wall ascii-skull-wall-left" aria-hidden="true"><pre>{'      .-"""-.\n    .\'  _ _  `.\n   /   (x x)   \\\n  |      ^      |\n  |    \\___/    |\n   \\    | |    /\n    |   | |   |\n    |___|_|___|'}</pre><pre>{'      _______\n    /         \\\n   /  O     O  \\\n  |      >      |\n  |   .-----.   |\n   \\  | | |  /\n    | | | | |\n    |_|_|_|_|'}</pre></div>
    <div className="ascii-skull-wall ascii-skull-wall-right" aria-hidden="true"><pre>{'       _____\n     /       \\\n    /  +   +  \\\n   |     _     |\n   |   /___\\   |\n    \\  | | |  /\n     | | | | |\n     |_|_|_|_|'}</pre><pre>{'     .--------.\n   .\'  _    _  `.\n  /   [ ]  [ ]   \\\n |       /\\       |\n |    ._______.    |\n  \\    || ||    /\n   |   || ||   |\n   |___||_||___|'}</pre></div>
    <TopBar signedIn={Boolean(auth.user)} onHelp={() => setModal(INFO.help)} onSignOut={auth.signOut} onNavigate={navigate}/>
    <main className="page-shell"><section className="hero"><div><h1>Welcome to <span>symbiosis</span></h1><p>Talk to your people. Share weird stuff. Stay online.</p></div><div className="hero-badge">★ NEW &amp; IMPROVED ★</div></section>
    {view === 'privacy' ? <PrivacyPolicy onBack={()=>navigate(auth.user?'lobby':'home')}/> : auth.user && auth.profile ? <section id="chatApp"><div className="layout-grid"><ProfileSidebar profile={auth.profile} friendRequests={friends.incoming.length} openReports={safety.reports.filter(r=>r.status==='open').length} onRules={() => setModal(INFO.rules)} onNavigate={navigate}/><div className="main-view">
      {['lobby','random','nostalgia'].includes(view) && <ChatRoom room={room} userId={auth.user.id} currentUsername={auth.profile.username} mentionUsers={[auth.profile,...people.people]} chatFramesEnabled={settings.chatFramesEnabled} targetMessageId={targetMessageId} messages={chat.messages} status={`${chat.status} ${settings.status}`.trim()} onSend={chat.send} onSlowMode={settings.updateSlowMode} pingsEnabled={chat.pingsEnabled} onEnablePings={chat.enablePings} lastSentAt={chat.lastSentAt} serverRemaining={chat.serverRemaining} slowModeSeconds={settings.slowModeSeconds} isModerator={moderator} onJumpMessage={jumpToMessage} onReport={(message)=>setReportTarget({label:'message',userId:message.user_id,messageId:message.id})} onViewProfile={(person) => { setSelectedPerson(person); setView('profile'); }}/>} 
      {view === 'dms' && <DirectMessages user={auth.user} chatFramesEnabled={settings.chatFramesEnabled} people={friends.friends.filter(p=>!safety.isBlocked(p.id))} requests={friends.incoming.filter(r=>!safety.isBlocked(r.person.id))} friendsApi={friends} initialPerson={selectedPerson} onViewProfile={(person) => { setSelectedPerson(person); setView('profile'); }}/>} 
      {view === 'profile' && <ProfilePage currentUser={auth.user} profile={auth.profile} viewedProfile={selectedPerson} isOnline={presence.isOnline} friendsApi={friends} safety={safety} onReport={(person)=>setReportTarget({label:'user',userId:person.id,messageId:null})} onUpdated={auth.setProfile} onMessage={(person) => { setSelectedPerson(person); setView('dms'); }}/>} 
      {view === 'moderation' && moderator && <ModeratorPanel reports={safety.reports} status={`${safety.status} ${settings.status}`.trim()} slowModeSeconds={settings.slowModeSeconds} chatFramesEnabled={settings.chatFramesEnabled} onSlowMode={settings.updateSlowMode} onChatFrames={settings.updateChatFrames} onReview={safety.review} onDeleteMessage={safety.deleteMessage}/>}
    </div></div></section> : <AuthPanel status={auth.status} loading={auth.loading} onSignIn={auth.signIn} onSignUp={auth.signUp}/>} 
    <footer><button className="footer-link" onClick={() => navigate('privacy')}>Privacy</button> · <button className="footer-link" onClick={()=>setModal(INFO.rules)}>Rules</button><div>symbiosis · 2026</div></footer></main>
    <InfoModal info={modal} onClose={() => setModal(null)}/>
    <ReportDialog target={reportTarget} onSubmit={safety.report} onClose={()=>setReportTarget(null)}/>
  </>;
}
