import { useEffect, useState } from 'react';
import { loadTopFriends, saveTopFriends, updateProfile, uploadAvatar, uploadProfileMusic } from '../services/profiles.js';
import Avatar from './Avatar.jsx';
import ProfileMusic, { BUILT_IN_TRACKS } from './ProfileMusic.jsx';
import CustomAudioPlayer from './CustomAudioPlayer.jsx';

export default function ProfilePage({ currentUser, profile, viewedProfile, isOnline, friendsApi, safety, onUpdated, onMessage, onReport, onViewProfile }) {
  const own = !viewedProfile || viewedProfile.id === currentUser.id;
  const shown = own ? profile : viewedProfile;
  const [form, setForm] = useState({
    bio: profile.bio || '', location: profile.location || '', mood: profile.mood || '',
    avatar_url: profile.avatar_url || '', accent_color: profile.accent_color || '#39ff14',
    background_color: profile.background_color || '#080b10', frame_style: profile.frame_style || 'neon',
    music_url: profile.music_url || '', music_title: profile.music_title || '', music_track: profile.music_track || '',
    player_style: profile.player_style || 'terminal',status_mode:profile.status_mode||'online',away_message:profile.away_message||'',profile_html:profile.profile_html||'',entry_sound:Boolean(profile.entry_sound)
  });
  const [topFriendIds,setTopFriendIds]=useState([]);
  const [topFriendProfiles,setTopFriendProfiles]=useState([]);
  useEffect(()=>{loadTopFriends(shown.id).then(rows=>{setTopFriendIds(rows.map(row=>row.friend_id));setTopFriendProfiles(rows.map(row=>row.profile).filter(Boolean))}).catch(()=>{setTopFriendIds([]);setTopFriendProfiles([])})},[shown.id]);
  const [status, setStatus] = useState('');
  if (!own) {
    const relationship = friendsApi.relationshipFor(shown.id);
    const isFriend = relationship?.status === 'accepted';
    const incoming = relationship?.status === 'pending' && relationship.addressee_id === currentUser.id;
    const blocked = safety.isBlocked(shown.id);
    async function blockUser() { if (relationship) await friendsApi.remove(relationship.id); await safety.block(shown.id); }
    const topFriends=topFriendProfiles;
    return <section className="profile-space" style={{ '--space-accent': shown.accent_color || '#39ff14', '--space-bg': shown.background_color || '#080b10' }}>
      <div className="profile-banner"><Avatar profile={shown} size="large"/><div><h1>{shown.username}'s symbiosis</h1><div className="account-tags">{(shown.tags||[]).map(tag=><span className={`account-tag tag-${tag.toLowerCase().replace(/[^a-z]/g,'')}`} key={tag}>{tag}</span>)}</div><p>{shown.mood || 'just hanging out online'}</p><span className={`status-icon status-${shown.status_mode||'online'}`}>● {shown.status_mode==='invisible'||!isOnline(shown.id)?'Offline':shown.status_mode||'Online'}</span></div></div>
      <div className="profile-actions-bar">{blocked ? <button className="tiny-tool" onClick={()=>safety.unblock(shown.id)}>Unblock user</button> : <>{isFriend ? <><button className="neon-button" onClick={()=>onMessage(shown)}>Send private message</button><button className="tiny-tool" onClick={()=>friendsApi.remove(relationship.id)}>Remove friend</button></> : incoming ? <><button className="neon-button" onClick={()=>friendsApi.accept(relationship.id)}>Accept friend request</button><button className="tiny-tool" onClick={()=>friendsApi.decline(relationship.id)}>Decline</button></> : relationship?.status==='pending' ? <span>Friend request pending…</span> : <button className="neon-button" onClick={()=>friendsApi.request(shown.id)}>+ Add friend</button>}<button className="tiny-tool danger" onClick={blockUser}>Block</button><button className="tiny-tool" onClick={()=>onReport(shown)}>⚑ Report user</button></>}</div>
      <div className="profile-grid"><div className="space-box"><h2>About me</h2><p>{shown.bio || 'This user has not customized their About Me yet.'}</p><p><b>Location:</b> {shown.location || 'Somewhere on the Internet'}</p><p><b>Joined:</b> {new Date(shown.created_at).toLocaleDateString()}</p>{shown.away_message&&<p className="away-message">{shown.status_mode.toUpperCase()}: {shown.away_message}</p>}</div><div className="space-box"><h2>Profile song</h2>{shown.music_track ? <><b>{BUILT_IN_TRACKS.find(t=>t.id===shown.music_track)?.title}</b><ProfileMusic trackId={shown.music_track} autoStart/></> : shown.music_url ? <><CustomAudioPlayer src={shown.music_url} title={shown.music_title || 'My profile song'} styleName={shown.player_style} autoStart/><small>Press play if your browser blocked autoplay.</small></> : <p>No profile song yet.</p>}</div><div className="space-box top-friends-box"><h2>Top Friends</h2>{topFriends.length?<div className="top-friends-grid">{topFriends.map(person=><button key={person.id} onClick={()=>onViewProfile?.(person)}><Avatar profile={person}/><span>{person.username}</span></button>)}</div>:<p>No Top Friends selected.</p>}</div>{shown.profile_html&&<div className="space-box custom-html-box"><h2>Custom profile HTML</h2><iframe sandbox="" title={`${shown.username}'s custom profile area`} srcDoc={shown.profile_html}/></div>}</div>
    </section>;
  }

  async function save(event) {
    event.preventDefault();
    try { const updated = await updateProfile(currentUser.id, form); await saveTopFriends(currentUser.id,topFriendIds);onUpdated(updated); setStatus('Profile saved!'); }
    catch (error) { setStatus(error.message); }
  }
  async function chooseAvatar(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try { setStatus('Uploading image…'); const avatar_url = await uploadAvatar(currentUser.id, file); setForm(current=>({...current,avatar_url})); setStatus('Uploaded — press Save my symbiosis.'); }
    catch(error){ setStatus(error.message); }
  }
  async function chooseMusic(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      setStatus('Uploading song…');
      const music_url = await uploadProfileMusic(currentUser.id, file);
      const fallbackTitle = file.name.replace(/\.[^.]+$/, '');
      setForm(current=>({...current,music_url,music_title:current.music_title||fallbackTitle,music_track:''}));
      setStatus('Song uploaded — press Save my symbiosis.');
    } catch(error) { setStatus(error.message); }
  }
  const preview = { ...profile, ...form };
  return <section className="panel profile-editor"><div className="panel-title">Customize my symbiosis</div><form className="panel-body customize-grid" onSubmit={save}>
    <div className="custom-preview" style={{ '--space-accent': form.accent_color, '--space-bg': form.background_color }}><Avatar profile={preview} size="large"/><strong>{profile.username}</strong><span>{form.mood || 'your mood here'}</span><small>{form.status_mode.toUpperCase()} {form.away_message&&`· ${form.away_message}`}</small></div>
    <div className="custom-fields"><label>Status<select value={form.status_mode} onChange={e=>setForm({...form,status_mode:e.target.value})}><option value="online">Online</option><option value="away">Away</option><option value="busy">Busy</option><option value="invisible">Invisible</option></select></label><label>Custom away/status message<input maxLength="120" value={form.away_message} onChange={e=>setForm({...form,away_message:e.target.value})}/></label><label className="check-label"><input type="checkbox" checked={form.entry_sound} onChange={e=>setForm({...form,entry_sound:e.target.checked})}/> Play dial-up Internet sound when I enter Symbiosis</label><label>Upload square profile picture<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseAvatar}/><small>PNG, JPG, WebP or GIF · maximum 5 MB</small></label><label>Or paste an image URL<input type="url" value={form.avatar_url} onChange={e=>setForm({...form,avatar_url:e.target.value})} placeholder="https://...image.jpg"/></label><label>Profile frame<select value={form.frame_style} onChange={e=>setForm({...form,frame_style:e.target.value})}><option value="none">None</option><option value="neon">Neon glow</option><option value="double">Double chrome</option><option value="pixel">Pixel frame</option><option value="fire">Fire gradient</option></select></label><div className="color-row"><label>Profile accent<input type="color" value={form.accent_color} onChange={e=>setForm({...form,accent_color:e.target.value})}/></label><label>Profile background<input type="color" value={form.background_color} onChange={e=>setForm({...form,background_color:e.target.value})}/></label></div><label>Mood<input maxLength="40" value={form.mood} onChange={e=>setForm({...form,mood:e.target.value})}/></label><label>Location<input maxLength="80" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>About me<textarea maxLength="500" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label><label>Custom profile HTML/CSS<textarea className="html-editor" maxLength="12000" value={form.profile_html} onChange={e=>setForm({...form,profile_html:e.target.value})} placeholder="Safe custom area: HTML and CSS. Scripts cannot run."/><small>Displayed in a locked sandbox. JavaScript, cookies, and access to Symbiosis are blocked.</small></label><fieldset className="top-friends-editor"><legend>Top Friends (up to 8)</legend>{(friendsApi.friends||[]).map(person=><label key={person.id}><input type="checkbox" checked={topFriendIds.includes(person.id)} disabled={!topFriendIds.includes(person.id)&&topFriendIds.length>=8} onChange={e=>setTopFriendIds(current=>e.target.checked?[...current,person.id]:current.filter(id=>id!==person.id))}/><Avatar profile={person}/>{person.username}</label>)}</fieldset><label>Pick an original built-in song<select value={form.music_track} onChange={e=>setForm({...form,music_track:e.target.value})}>{BUILT_IN_TRACKS.map(track=><option key={track.id} value={track.id}>{track.title}</option>)}</select></label>{form.music_track&&<ProfileMusic trackId={form.music_track}/>}<label>Or upload your own profile song<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav,audio/mp4,.mp3,.ogg,.wav,.m4a" onChange={chooseMusic}/><small>MP3, OGG, WAV or M4A · maximum 20 MB · upload only music you have permission to use</small></label>{form.music_url&&<audio className="music-preview" controls src={form.music_url}/>}<label>Or use a direct audio URL<input type="url" value={form.music_url} onChange={e=>setForm({...form,music_url:e.target.value,music_track:''})} placeholder="https://...song.mp3"/></label><label>Song title<input maxLength="100" value={form.music_title} onChange={e=>setForm({...form,music_title:e.target.value})}/></label><div className="profile-actions"><span>{status}</span><button className="glossy-button green">Save my symbiosis »</button></div></div>
    <div className="player-customizer" style={{'--space-accent':form.accent_color,'--space-bg':form.background_color}}><label>Player skin<select value={form.player_style} onChange={e=>setForm({...form,player_style:e.target.value})}><option value="terminal">Terminal green</option><option value="winamp">Winamp-ish silver</option><option value="barebones">Barebones HTML</option></select></label>{form.music_url&&<CustomAudioPlayer src={form.music_url} title={form.music_title||'My profile song'} styleName={form.player_style}/>}</div>
  </form></section>;
}
