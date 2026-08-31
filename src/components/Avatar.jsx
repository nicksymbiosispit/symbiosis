export default function Avatar({ profile, size = 'normal' }) {
  const style = { '--profile-accent': profile?.accent_color || '#39ff14' };
  return <div className={`profile-frame frame-${profile?.frame_style || 'neon'} avatar-${size}`} style={style}>
    {profile?.avatar_url ? <img src={profile.avatar_url} alt={`${profile.username}'s profile`}/> : <span>{profile?.username?.[0]?.toUpperCase() || '?'}</span>}
  </div>;
}
