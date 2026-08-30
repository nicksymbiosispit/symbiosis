const firstLetter = (name = '?') => name.trim().charAt(0).toUpperCase() || '?';

export default function ProfileSidebar({ profile, onRules, onNavigate }) {
  const username = profile.username;
  return <aside className="sidebar">
    <div className="panel"><div className="panel-title">Your Symbiosis</div><div className="panel-body profile-box"><div className="avatar">{firstLetter(username)}</div><div><div className="profile-name">{username}</div><div className="online"><span/> online now</div></div></div></div>
    <div className="panel"><div className="panel-title">Navigation</div><div className="panel-body room-list">
      <button className="room" onClick={() => onNavigate('lobby')}># lobby</button><button className="room" onClick={() => onNavigate('dms')}>✉ direct messages</button><button className="room" onClick={() => onNavigate('profile')}>☺ my profile</button>
      <button className="room" disabled># random — soon</button><button className="room" disabled># nostalgia — soon</button>
    </div></div>
    <div className="panel mini-note"><div className="panel-title">Internet tip</div><div className="panel-body"><strong>♥ Be cool.</strong><p>Symbiosis is better when people are nice to each other.</p><button className="text-button" onClick={onRules}>community rules</button></div></div>
  </aside>;
}
