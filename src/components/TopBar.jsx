export default function TopBar({ signedIn, onHelp, onSignOut, onNavigate }) {
  return <header className="topbar">
    <div className="logo-wrap"><button className="logo logo-button" onClick={() => onNavigate?.('lobby')}>symbiosis</button><span className="release-badge">1.0.0</span></div>
    <nav className="top-actions" aria-label="Main navigation">
      <button className="text-button" onClick={() => onNavigate?.('lobby')}>Home</button>
      {signedIn && <><button className="text-button" onClick={() => onNavigate('dms')}>Messages</button><button className="text-button" onClick={() => onNavigate('profile')}>Profile</button></>}
      <button className="text-button" onClick={onHelp}>Help</button><span className="top-divider">|</span>
      {signedIn && <button className="text-button" onClick={onSignOut}>Sign out</button>}
    </nav>
  </header>;
}
