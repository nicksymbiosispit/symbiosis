export default function Avatar({ profile, size = 'normal', showFrame = true }) {
  const frame = profile?.frame_style === 'fire' ? 'none' : profile?.frame_style || 'neon';
  const style = { '--profile-accent': profile?.accent_color || '#39ff14' };
  return <div className={`profile-frame ${showFrame?`frame-${frame}`:'chat-frame-off'} avatar-${size}`} style={style}>
    {profile?.avatar_url ? <img referrerPolicy="no-referrer" src={profile.avatar_url} alt={`${profile.username}'s profile`}/> : <span>{profile?.username?.[0]?.toUpperCase() || '?'}</span>}
  </div>;
}
