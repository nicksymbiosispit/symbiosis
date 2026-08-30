export default function TopBar({ signedIn, onHelp, onSignOut, onNavigate }) {
  return <header className="topbar">
    <div className="topbar-inner">
      <a className="logo" href="#top">symbiosis<span>.com</span></a>
      <nav aria-label="Main navigation">
        <button onClick={() => onNavigate?.('lobby')}>Home</button>{signedIn && <><i>|</i><button onClick={() => onNavigate('dms')}>Mail</button><i>|</i><button onClick={() => onNavigate('profile')}>Profile</button></>}<i>|</i><button onClick={onHelp}>Help</button>
        {signedIn && <><i>|</i><button onClick={onSignOut}>Sign Out</button></>}
      </nav>
    </div>
  </header>;
}
