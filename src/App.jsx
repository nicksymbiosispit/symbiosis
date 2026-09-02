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
import { useCommunity } from './hooks/useCommunity.js';
import RoomsPage from './components/RoomsPage.jsx';
import BulletinsPage from './components/BulletinsPage.jsx';

const INFO = {
  help: { title: 'Symbiosis Help', text: 'Create an account or sign in, then post a message in #lobby. New messages appear live for everyone connected.' },
  rules: { title: 'Community Rules', text: 'Be decent. No harassment, threats, hate, impersonation, spam, sexual exploitation, or sharing private information. Keep posts relevant to the room or discussion. You may report abusive, unsafe, spammy, or irrelevant/off-topic content. Use report and block when something is wrong; moderators may remove content and restrict accounts.' }
};

export default function App() {
  const auth = useAuth();
  const people = usePeople(auth.user?.id);
  const friends = useFriends(auth.user?.id, people.people);
  const tags=auth.profile?.tags||[];
  const moderator = auth.profile?.role === 'moderator'||tags.some(tag=>['MOD','OWNER','CO-OWNER'].includes(tag));
  const safety = useSafety(auth.user?.id, moderator);
  const [view, setView] = useState(()=>new URLSearchParams(window.location.search).get('room')||'lobby');
  const [targetMessageId, setTargetMessageId] = useState(()=>new URLSearchParams(window.location.search).get('message'));
  const [targetBulletinId,setTargetBulletinId]=useState(()=>new URLSearchParams(window.location.search).get('bulletin'));
  const community=useCommunity(auth.user?.id,moderator);
  const activeSiteBan=community.actions.find(action=>action.target_user_id===auth.user?.id&&action.action_type==='ban'&&!action.room_slug&&!action.revoked_at&&(!action.expires_at||new Date(action.expires_at)>new Date()));
  const roomRecord=community.rooms.find(item=>item.slug===view);
  const room = roomRecord?.slug||'lobby';
  const chat = useMessages(auth.user, safety.blockedIds, room, auth.profile?.username || '', targetMessageId);
  const presence = usePresence(auth.user, auth.profile);
  const settings = useLobbySettings(auth.user?.id);
  const [modal, setModal] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  useEffect(()=>{if(!auth.user||!auth.profile?.entry_sound||sessionStorage.getItem('symbiosis-entry-sound'))return;const play=()=>{try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();[440,620,880,1100,760,980].forEach((frequency,index)=>{const o=c.createOscillator(),g=c.createGain();o.type=index%2?'square':'sine';o.frequency.value=frequency;g.gain.setValueAtTime(.025,c.currentTime+index*.12);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+index*.12+.16);o.connect(g);g.connect(c.destination);o.start(c.currentTime+index*.12);o.stop(c.currentTime+index*.12+.17)});sessionStorage.setItem('symbiosis-entry-sound','1')}catch{}};window.addEventListener('pointerdown',play,{once:true});return()=>window.removeEventListener('pointerdown',play)},[auth.user,auth.profile?.entry_sound]);
  const navigate = (nextView) => { setView(nextView); setTargetMessageId(null); const url=new URL(window.location.href); url.searchParams.delete('room'); url.searchParams.delete('message'); window.history.replaceState({},'',url); if (nextView !== 'profile') setSelectedPerson(null); };
  const jumpToMessage = (nextRoom, messageId) => { if(!community.rooms.some(item=>item.slug===nextRoom))return;setView(nextRoom);setTargetMessageId(String(messageId));setSelectedPerson(null);const url=new URL(window.location.href);url.searchParams.set('room',nextRoom);url.searchParams.set('message',messageId);window.history.pushState({},'',url); };
  const jumpToRoom=(nextRoom)=>{if(!community.rooms.some(item=>item.slug===nextRoom))return;setView(nextRoom);setTargetMessageId(null);setTargetBulletinId(null);const url=new URL(window.location.href);url.search='';url.searchParams.set('room',nextRoom);window.history.pushState({},'',url)};
  const jumpToBulletin=(id)=>{setView('bulletins');setTargetBulletinId(String(id));setTargetMessageId(null);const url=new URL(window.location.href);url.search='';url.searchParams.set('bulletin',id);window.history.pushState({},'',url)};
  useEffect(()=>{const restore=()=>{const params=new URLSearchParams(window.location.search);setView(params.get('room')||'lobby');setTargetMessageId(params.get('message'))};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore)},[]);
  return <>
    <TopBar signedIn={Boolean(auth.user)} onHelp={() => setModal(INFO.help)} onSignOut={auth.signOut} onNavigate={navigate}/>
    <main className="page-shell"><section className="hero"><div><h1>Welcome to <span>symbiosis</span></h1><p>Talk to your people. Share weird stuff. Stay online.</p></div><div className="hero-badge">★ NEW &amp; IMPROVED ★</div></section>
    {view === 'privacy' ? <PrivacyPolicy onBack={()=>navigate(auth.user?'lobby':'home')}/> : auth.user && auth.profile ? activeSiteBan?<section className="panel banned-screen"><div className="panel-title">ACCESS TERMINATED</div><div className="panel-body"><h1>You are banned from Symbiosis.</h1><p>{activeSiteBan.reason||'No reason supplied.'}</p>{activeSiteBan.expires_at&&<p>Ends: {new Date(activeSiteBan.expires_at).toLocaleString()}</p>}</div></section>:<section id="chatApp"><div className="layout-grid"><ProfileSidebar profile={auth.profile} friendRequests={friends.incoming.length} openReports={safety.reports.filter(r=>r.status==='open').length} onRules={() => setModal(INFO.rules)} onNavigate={navigate}/><div className="main-view">
      {roomRecord && <ChatRoom room={room} userId={auth.user.id} currentUsername={auth.profile.username} mentionUsers={[auth.profile,...people.people]} availableRooms={community.rooms} chatFramesEnabled={settings.chatFramesEnabled} targetMessageId={targetMessageId} messages={chat.messages} status={`${chat.status} ${settings.status}`.trim()} onSend={chat.send} onDelete={moderator?safety.deleteMessage:chat.deleteMessage} canDeleteAny={moderator} onSlowMode={seconds=>community.updateRoom(room,{slow_mode_seconds:seconds})} pingsEnabled={chat.pingsEnabled} onEnablePings={chat.enablePings} lastSentAt={chat.lastSentAt} serverRemaining={chat.serverRemaining} slowModeSeconds={roomRecord.slow_mode_seconds} mediaMode={roomRecord.media_mode} isModerator={moderator} onJumpMessage={jumpToMessage} onJumpRoom={jumpToRoom} onJumpBulletin={jumpToBulletin} onReport={(message)=>setReportTarget({label:'message',userId:message.user_id,messageId:message.id})} onViewProfile={(person) => { setSelectedPerson(person); setView('profile'); }}/>} 
      {view==='rooms'&&<RoomsPage rooms={community.rooms} currentUserId={auth.user.id} isStaff={moderator} onOpen={jumpToRoom} onCreate={community.createRoom} onUpdate={community.updateRoom} status={community.status}/>} 
      {view==='bulletins'&&<BulletinsPage bulletins={community.bulletins} targetBulletinId={targetBulletinId} currentUserId={auth.user.id} isStaff={moderator} onPost={community.postBulletin} onDelete={community.deleteBulletin} status={community.status}/>} 
      {view === 'dms' && <DirectMessages user={auth.user} chatFramesEnabled={settings.chatFramesEnabled} people={friends.friends.filter(p=>!safety.isBlocked(p.id))} requests={friends.incoming.filter(r=>!safety.isBlocked(r.person.id))} friendsApi={friends} initialPerson={selectedPerson} onViewProfile={(person) => { setSelectedPerson(person); setView('profile'); }}/>} 
      {view === 'profile' && <ProfilePage currentUser={auth.user} profile={auth.profile} viewedProfile={selectedPerson} isOnline={presence.isOnline} friendsApi={friends} safety={safety} onViewProfile={(person)=>{setSelectedPerson(person);setView('profile')}} onReport={(person)=>setReportTarget({label:'user',userId:person.id,messageId:null})} onUpdated={auth.setProfile} onMessage={(person) => { setSelectedPerson(person); setView('dms'); }}/>} 
      {view === 'moderation' && moderator && <ModeratorPanel reports={safety.reports} deletionLogs={community.logs} actions={community.actions} people={people.people} rooms={community.rooms} canManageTags={tags.includes('OWNER')} status={`${safety.status} ${community.status}`.trim()} chatFramesEnabled={settings.chatFramesEnabled} onChatFrames={settings.updateChatFrames} onReview={safety.review} onDeleteMessage={safety.deleteMessage} onModerate={community.moderate} onRevoke={community.revokeAction} onUpdateRoom={community.updateRoom} onUpdateTags={community.updateTags}/>} 
    </div></div></section> : <AuthPanel status={auth.status} loading={auth.loading} onSignIn={auth.signIn} onSignUp={auth.signUp}/>} 
    <footer><button className="footer-link" onClick={() => navigate('privacy')}>Privacy</button> · <button className="footer-link" onClick={()=>setModal(INFO.rules)}>Rules</button><div>symbiosis · 2026</div></footer></main>
    <InfoModal info={modal} onClose={() => setModal(null)}/>
    <ReportDialog target={reportTarget} onSubmit={safety.report} onClose={()=>setReportTarget(null)}/>
  </>;
}
