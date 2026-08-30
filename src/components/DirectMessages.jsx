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
  return <section><div className="section-heading orange">My Mail</div><div className="people-layout">
    <aside className="people-list"><h2>Friends / People</h2>{!people.length && <p className="status">No other members yet.</p>}{people.map((person) => <button key={person.id} className={`person-button ${selected?.id===person.id?'active':''}`} onClick={() => setSelected(person)}><span className="person-dot">{person.username[0].toUpperCase()}</span><span><b>{person.username}</b><br/><small>{person.mood || 'Online'}</small></span></button>)}</aside>
    <div className="dm-panel">{selected ? <><div className="dm-header">Conversation with <button onClick={() => onViewProfile(selected)}>{selected.username}</button></div><div className="dm-messages">{!dm.messages.length && <div className="empty">No messages yet. Say hi!</div>}{dm.messages.map((message) => <article key={message.id} className={`dm-message ${message.sender_id===user.id?'mine':''}`}><b>{message.sender_id===user.id?'You':selected.username}</b><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString()}</small></article>)}<div ref={endRef}/></div><form className="dm-composer" onSubmit={async(e)=>{e.preventDefault();if(await dm.send(body))setBody('')}}><textarea maxLength="1000" value={body} onChange={(e)=>setBody(e.target.value)} placeholder={`Message ${selected.username}...`}/><div className="send-row"><span>{dm.status}</span><button className="web-button">SEND</button></div></form></> : <div className="empty">Choose someone to start a private conversation.</div>}</div>
  </div></section>;
}
