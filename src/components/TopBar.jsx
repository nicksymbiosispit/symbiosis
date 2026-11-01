import UserSearch from './UserSearch.jsx';

export default function TopBar({ signedIn, onHelp, onSignOut, onNavigate, currentUserId, friendsApi, blockedIds, onViewProfile, searchEnabled = true }) {
  return <header className="topbar">
    <div className="logo-wrap"><button className="logo logo-button" onClick={() => onNavigate?.('lobby')}>symbiosis</button><span className="release-badge">1.1.1</span></div>
    {signedIn && searchEnabled && currentUserId && friendsApi && <UserSearch key={currentUserId} currentUserId={currentUserId} friendsApi={friendsApi} blockedIds={blockedIds} onViewProfile={onViewProfile}/>}
    <nav className="top-actions" aria-label="Main navigation">
      <button className="text-button" onClick={() => onNavigate?.('lobby')}>Home</button>
      {signedIn && <><button className="text-button" onClick={() => onNavigate('dms')}>Messages</button><button className="text-button" onClick={() => onNavigate('profile')}>Profile</button></>}
      <button className="text-button" onClick={onHelp}>Help</button><span className="top-divider">|</span>
      {signedIn && <button className="text-button" onClick={onSignOut}>Sign out</button>}
    </nav>
  </header>;
}
