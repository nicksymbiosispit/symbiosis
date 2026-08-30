import { useState } from 'react';
import { updateProfile } from '../services/profiles.js';

export default function ProfilePage({ currentUser, profile, viewedProfile, onUpdated, onMessage }) {
  const own = !viewedProfile || viewedProfile.id === currentUser.id;
  const shown = own ? profile : viewedProfile;
  const [form, setForm] = useState({ bio: profile.bio || '', location: profile.location || '', mood: profile.mood || '' });
  const [status, setStatus] = useState('');
  if (!own) return <section className="panel"><div className="panel-title">{shown.username}'s profile</div><div className="panel-body public-profile"><div className="avatar profile-avatar">{shown.username[0].toUpperCase()}</div><h2>{shown.username}</h2><p><b>Mood:</b> {shown.mood || 'Not set'}</p><p><b>Location:</b> {shown.location || 'Somewhere on the Internet'}</p><p>{shown.bio || 'This user has not written an About Me yet.'}</p><button className="glossy-button blue" onClick={() => onMessage(shown)}>Send message »</button></div></section>;
  async function save(event) { event.preventDefault(); try { const updated=await updateProfile(currentUser.id,form); onUpdated(updated); setStatus('Profile saved!'); } catch(error){setStatus(error.message);} }
  return <section className="panel profile-editor"><div className="panel-title">Edit my profile</div><form className="panel-body" onSubmit={save}><label>Username<input value={profile.username} disabled/></label><label>Mood<input maxLength="40" value={form.mood} onChange={(e)=>setForm({...form,mood:e.target.value})}/></label><label>Location<input maxLength="80" value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})}/></label><label>About me<textarea maxLength="500" value={form.bio} onChange={(e)=>setForm({...form,bio:e.target.value})}/></label><div className="profile-actions"><span>{status}</span><button className="glossy-button blue">Save changes »</button></div></form></section>;
}
