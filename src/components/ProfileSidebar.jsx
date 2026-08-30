const firstLetter = (name = '?') => name.trim().charAt(0).toUpperCase() || '?';

export default function ProfileSidebar({ profile, onRules, onNavigate }) {
  const username = profile.username;
  return <aside className="profile-sidebar">
    <h1>{username}'s Space</h1>
    <div className="profile-card">
      <div className="big-avatar">{firstLetter(username)}</div>
      <div className="profile-facts"><strong>{username}</strong><p>"{profile.mood || 'online and thriving'}"</p><p>{profile.location || 'Somewhere on the Internet'}</p><span className="online-now">● Online Now!</span></div>
    </div>
    <div className="contact-box"><div>My Controls</div><div className="contact-links"><button onClick={() => onNavigate('dms')}>✉ My Mail</button><button onClick={() => onNavigate('profile')}>☺ Edit Profile</button><span>★ Add Friends soon</span><span>⚑ Safety tools soon</span></div></div>
    <div className="sidebar-module"><h2>My Rooms</h2><button className="active"># lobby</button><button disabled># random <small>soon</small></button><button disabled># nostalgia <small>soon</small></button><button disabled># music <small>soon</small></button></div>
    <div className="sidebar-module rules"><h2>Internet Safety</h2><p>Be cool. Protect your personal info.</p><button onClick={onRules}>Read community rules »</button></div>
  </aside>;
}
