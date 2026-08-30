import { useEffect, useRef, useState } from 'react';
import { useDirectMessages } from '../hooks/useDirectMessages.js';

export default function DirectMessages({ user, people, initialPerson, onViewProfile }) {
  const [selected, setSelected] = useState(initialPerson || people[0] || null);
  const [body, setBody] = useState('');
  const endRef = useRef(null);
  useEffect(() => { if (initialPerson) setSelected(initialPerson); }, [initialPerson]);
  useEffect(() => { if (!selected && people[0]) setSelected(people[0]); }, [people, selected]);
  const dm = useDirectMessages(user, selected);
  useEffect(() => endRef.current?.scrollIntoView(), [dm.messages]);
  return <section className="panel dm-shell"><div className="panel-title">Direct messages</div><div className="dm-layout">
    <aside className="dm-people"><div className="dm-subtitle">People</div>{!people.length&&<p className="dm-note">No other members yet.</p>}{people.map(person=><button key={person.id} className={`dm-person ${selected?.id===person.id?'active':''}`} onClick={()=>setSelected(person)}><span className="message-avatar">{person.username[0].toUpperCase()}</span><span><strong>{person.username}</strong><small>{person.mood||'online'}</small></span></button>)}</aside>
    <div className="dm-conversation">{selected?<><div className="dm-subtitle">Conversation with <button className="text-button light-link" onClick={()=>onViewProfile(selected)}>{selected.username}</button></div><div className="dm-scroll">{!dm.messages.length&&<div className="empty-chat">No messages yet. Say hi!</div>}{dm.messages.map(message=><article key={message.id} className={`dm-message ${message.sender_id===user.id?'mine':''}`}><strong>{message.sender_id===user.id?'You':selected.username}</strong><span>{new Date(message.created_at).toLocaleString()}</span><p>{message.body}</p></article>)}<div ref={endRef}/></div><form className="composer dm-compose" onSubmit={async(e)=>{e.preventDefault();if(await dm.send(body))setBody('')}}><div className="composer-row"><input maxLength="1000" value={body} onChange={e=>setBody(e.target.value)} placeholder={`Message ${selected.username}...`}/><button className="glossy-button green">Send »</button></div><div className="composer-foot"><span>Private conversation</span><span>{dm.status}</span></div></form></>:<div className="empty-chat">Choose someone to start a private conversation.</div>}</div>
  </div></section>;
}
