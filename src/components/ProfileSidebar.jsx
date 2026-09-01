import Avatar from './Avatar.jsx';

export default function ProfileSidebar({ profile, friendRequests, openReports = 0, onRules, onNavigate }) {
  const username = profile.username;
  return <aside className="sidebar">
    <div className="panel"><div className="panel-title">Your Symbiosis</div><div className="panel-body profile-box"><Avatar profile={profile}/><div><div className="profile-name">{username} {profile.role==='moderator'&&<span className="mod-badge">MOD</span>}</div><div className="online"><span/> online now</div><div className="profile-mood">{profile.mood || 'feeling electric'}</div></div></div></div>
    <div className="panel"><div className="panel-title">Navigation</div><div className="panel-body room-list">
      <button className="room" onClick={() => onNavigate('lobby')}># lobby</button><button className="room" onClick={() => onNavigate('dms')}>✉ friends & messages {friendRequests ? `(${friendRequests})` : ''}</button><button className="room" onClick={() => onNavigate('profile')}>☺ customize my profile</button>
      {profile.role==='moderator'&&<button className="room mod-room" onClick={()=>onNavigate('moderation')}>★ moderator tools {openReports ? `(${openReports})` : ''}</button>}
      <button className="room" onClick={()=>onNavigate('random')}># random</button><button className="room" onClick={()=>onNavigate('nostalgia')}># nostalgia</button>
    </div></div>
    <div className="panel mini-note"><div className="panel-title">Internet tip</div><div className="panel-body"><p>Keep it respectful, symbiosis doesn't need toxic garbage.</p><button className="text-button" onClick={onRules}>community rules</button></div></div>
  </aside>;
}
