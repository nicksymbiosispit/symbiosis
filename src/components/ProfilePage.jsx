import { useState } from 'react';
import { updateProfile } from '../services/profiles.js';

export default function ProfilePage({ currentUser, profile, viewedProfile, onUpdated, onMessage }) {
  const own = !viewedProfile || viewedProfile.id === currentUser.id;
  const shown = own ? profile : viewedProfile;
  const [form, setForm] = useState({ bio: profile.bio || '', location: profile.location || '', mood: profile.mood || '' });
  const [status, setStatus] = useState('');
  if (!own) return <section className="profile-preview"><div className="section-heading orange">{shown.username}'s Profile</div><h2>{shown.username}</h2><p><b>Mood:</b> {shown.mood || 'Not set'}</p><p><b>Location:</b> {shown.location || 'Somewhere on the Internet'}</p><p>{shown.bio || 'This user has not written an About Me yet.'}</p><button className="web-button" onClick={() => onMessage(shown)}>SEND MESSAGE</button></section>;
  async function save(event) { event.preventDefault(); try { const updated=await updateProfile(currentUser.id,form); onUpdated(updated); setStatus('Profile saved!'); } catch(error){setStatus(error.message);} }
  return <section className="profile-form"><div className="section-heading blue">Edit My Profile</div><form onSubmit={save}><label>Username<input value={profile.username} disabled/></label><label>Mood<input maxLength="40" value={form.mood} onChange={(e)=>setForm({...form,mood:e.target.value})}/></label><label>Location<input maxLength="80" value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})}/></label><label>About Me<textarea maxLength="500" value={form.bio} onChange={(e)=>setForm({...form,bio:e.target.value})}/></label><div className="send-row"><span>{status}</span><button className="web-button">SAVE CHANGES</button></div></form></section>;
}
