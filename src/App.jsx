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
  return <div id="top">
    <TopBar signedIn={Boolean(auth.user)} onHelp={() => setModal(INFO.help)} onSignOut={auth.signOut} onNavigate={navigate}/>
    <div className="announcement">★ SYMBIOSIS — A PLACE FOR FRIENDS ★</div>
    {auth.user && auth.profile ? <main className="app-shell"><ProfileSidebar profile={auth.profile} onRules={() => setModal(INFO.rules)} onNavigate={navigate}/><div className="content-column">
      {view === 'lobby' && <ChatRoom {...chat}/>} 
      {view === 'dms' && <DirectMessages user={auth.user} people={people.people} initialPerson={selectedPerson} onViewProfile={(person) => { setSelectedPerson(person); setView('profile'); }}/>} 
      {view === 'profile' && <ProfilePage currentUser={auth.user} profile={auth.profile} viewedProfile={selectedPerson} onUpdated={auth.setProfile} onMessage={(person) => { setSelectedPerson(person); setView('dms'); }}/>} 
    </div></main> : <AuthPanel status={auth.status} loading={auth.loading} onSignIn={auth.signIn} onSignUp={auth.signUp}/>} 
    <footer><a href="#about">About</a> | <button onClick={() => setModal(INFO.rules)}>Safety</button> | <a href="#privacy">Privacy</a> | <a href="#contact">Contact</a><p>© 2026 Symbiosis Internet Co. · Best viewed at 1024 × 768</p></footer>
    <InfoModal info={modal} onClose={() => setModal(null)}/>
  </div>;
}
