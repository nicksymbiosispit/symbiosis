import { useState } from 'react';
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

const INFO = {
  help: { title: 'Symbiosis Help', text: 'Create an account or sign in, then post a message in #lobby. New messages appear live for everyone connected.' },
  rules: { title: 'Community Rules', text: 'Be decent, do not spam, and never share private information. Add reporting and moderation tools before a large public launch.' }
};

export default function App() {
  const auth = useAuth();
  const chat = useMessages(auth.user);
  const people = usePeople(auth.user?.id);
  const [modal, setModal] = useState(null);
  const [view, setView] = useState('lobby');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const navigate = (nextView) => { setView(nextView); if (nextView !== 'profile') setSelectedPerson(null); };
  return <>
    <TopBar signedIn={Boolean(auth.user)} onHelp={() => setModal(INFO.help)} onSignOut={auth.signOut} onNavigate={navigate}/>
    <main className="page-shell"><section className="hero"><div><h1>Welcome to <span>symbiosis</span></h1><p>Talk to your people. Share weird stuff. Stay online.</p></div><div className="hero-badge">★ NEW &amp; IMPROVED ★</div></section>
    {auth.user && auth.profile ? <section id="chatApp"><div className="layout-grid"><ProfileSidebar profile={auth.profile} onRules={() => setModal(INFO.rules)} onNavigate={navigate}/><div className="main-view">
      {view === 'lobby' && <ChatRoom messages={chat.messages} status={chat.status} onSend={chat.send}/>} 
      {view === 'dms' && <DirectMessages user={auth.user} people={people.people} initialPerson={selectedPerson} onViewProfile={(person) => { setSelectedPerson(person); setView('profile'); }}/>} 
      {view === 'profile' && <ProfilePage currentUser={auth.user} profile={auth.profile} viewedProfile={selectedPerson} onUpdated={auth.setProfile} onMessage={(person) => { setSelectedPerson(person); setView('dms'); }}/>} 
    </div></div></section> : <AuthPanel status={auth.status} loading={auth.loading} onSignIn={auth.signIn} onSignUp={auth.signUp}/>} 
    <footer><a href="#about">About</a> · <button className="footer-link" onClick={() => setModal(INFO.rules)}>Privacy</button> · <a href="#terms">Terms</a> · <a href="#contact">Contact</a><div>© 2026 Symbiosis Internet Co. — best viewed with curiosity</div></footer></main>
    <InfoModal info={modal} onClose={() => setModal(null)}/>
  </>;
}
