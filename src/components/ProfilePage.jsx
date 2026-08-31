import { useEffect, useRef, useState } from 'react';
import { updateProfile } from '../services/profiles.js';
import Avatar from './Avatar.jsx';

export default function ProfilePage({ currentUser, profile, viewedProfile, friendsApi, safety, onUpdated, onMessage, onReport }) {
  const own = !viewedProfile || viewedProfile.id === currentUser.id;
  const shown = own ? profile : viewedProfile;
  const audioRef = useRef(null);
  const [form, setForm] = useState({
    bio: profile.bio || '', location: profile.location || '', mood: profile.mood || '',
    avatar_url: profile.avatar_url || '', accent_color: profile.accent_color || '#39ff14',
    background_color: profile.background_color || '#080b10', frame_style: profile.frame_style || 'neon',
    music_url: profile.music_url || '', music_title: profile.music_title || ''
  });
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!own && shown.music_url) void audioRef.current?.play().catch(() => {});
  }, [own, shown.id, shown.music_url]);

  if (!own) {
    const relationship = friendsApi.relationshipFor(shown.id);
    const isFriend = relationship?.status === 'accepted';
    const incoming = relationship?.status === 'pending' && relationship.addressee_id === currentUser.id;
    const blocked = safety.isBlocked(shown.id);
    async function blockUser() { if (relationship) await friendsApi.remove(relationship.id); await safety.block(shown.id); }
    return <section className="profile-space" style={{ '--space-accent': shown.accent_color || '#39ff14', '--space-bg': shown.background_color || '#080b10' }}>
      <div className="profile-banner"><Avatar profile={shown} size="large"/><div><h1>{shown.username}'s space {shown.role==='moderator'&&<span className="mod-badge">MOD</span>}</h1><p>{shown.mood || 'just hanging out online'}</p><span>● Online now</span></div></div>
      <div className="profile-actions-bar">{blocked ? <button className="tiny-tool" onClick={()=>safety.unblock(shown.id)}>Unblock user</button> : <>{isFriend ? <><button className="neon-button" onClick={()=>onMessage(shown)}>Send private message</button><button className="tiny-tool" onClick={()=>friendsApi.remove(relationship.id)}>Remove friend</button></> : incoming ? <><button className="neon-button" onClick={()=>friendsApi.accept(relationship.id)}>Accept friend request</button><button className="tiny-tool" onClick={()=>friendsApi.decline(relationship.id)}>Decline</button></> : relationship?.status==='pending' ? <span>Friend request pending…</span> : <button className="neon-button" onClick={()=>friendsApi.request(shown.id)}>+ Add friend</button>}<button className="tiny-tool danger" onClick={blockUser}>Block</button><button className="tiny-tool" onClick={()=>onReport(shown)}>⚑ Report user</button></>}</div>
      <div className="profile-grid"><div className="space-box"><h2>About me</h2><p>{shown.bio || 'This user has not customized their About Me yet.'}</p><p><b>Location:</b> {shown.location || 'Somewhere on the Internet'}</p></div><div className="space-box"><h2>Profile song</h2>{shown.music_url ? <><b>{shown.music_title || 'My profile song'}</b><audio ref={audioRef} controls src={shown.music_url}/><small>Press play if your browser blocked autoplay.</small></> : <p>No profile song yet.</p>}</div></div>
    </section>;
  }

  async function save(event) {
    event.preventDefault();
    try { const updated = await updateProfile(currentUser.id, form); onUpdated(updated); setStatus('Profile saved!'); }
    catch (error) { setStatus(error.message); }
  }
  const preview = { ...profile, ...form };
  return <section className="panel profile-editor"><div className="panel-title">Customize my space</div><form className="panel-body customize-grid" onSubmit={save}>
    <div className="custom-preview" style={{ '--space-accent': form.accent_color, '--space-bg': form.background_color }}><Avatar profile={preview} size="large"/><strong>{profile.username}</strong><span>{form.mood || 'your mood here'}</span></div>
    <div className="custom-fields"><label>Square profile picture URL<input type="url" value={form.avatar_url} onChange={e=>setForm({...form,avatar_url:e.target.value})} placeholder="https://...image.jpg"/></label><label>Profile frame<select value={form.frame_style} onChange={e=>setForm({...form,frame_style:e.target.value})}><option value="none">None</option><option value="neon">Neon glow</option><option value="double">Double chrome</option><option value="pixel">Pixel frame</option><option value="fire">Fire gradient</option></select></label><div className="color-row"><label>Neon accent<input type="color" value={form.accent_color} onChange={e=>setForm({...form,accent_color:e.target.value})}/></label><label>Profile background<input type="color" value={form.background_color} onChange={e=>setForm({...form,background_color:e.target.value})}/></label></div><label>Mood<input maxLength="40" value={form.mood} onChange={e=>setForm({...form,mood:e.target.value})}/></label><label>Location<input maxLength="80" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>About me<textarea maxLength="500" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label><label>Profile music URL<input type="url" value={form.music_url} onChange={e=>setForm({...form,music_url:e.target.value})} placeholder="Direct link to an MP3/audio file"/></label><label>Song title<input maxLength="100" value={form.music_title} onChange={e=>setForm({...form,music_title:e.target.value})}/></label><div className="profile-actions"><span>{status}</span><button className="glossy-button green">Save my space »</button></div></div>
  </form></section>;
}
