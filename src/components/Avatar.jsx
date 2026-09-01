export default function Avatar({ profile, size = 'normal', showFrame = true }) {
  const style = { '--profile-accent': profile?.accent_color || '#39ff14' };
  return <div className={`profile-frame ${showFrame?`frame-${profile?.frame_style || 'neon'}`:'chat-frame-off'} avatar-${size}`} style={style}>
    {profile?.avatar_url ? <img src={profile.avatar_url} alt={`${profile.username}'s profile`}/> : <span>{profile?.username?.[0]?.toUpperCase() || '?'}</span>}
  </div>;
}
