import { useEffect, useRef, useState } from 'react';
import { useDirectMessages } from '../hooks/useDirectMessages.js';
import Avatar from './Avatar.jsx';
import EmojiPicker from './EmojiPicker.jsx';

export default function DirectMessages({ user, people, requests, friendsApi, initialPerson, onViewProfile, chatFramesEnabled=true }) {
  const [selected, setSelected] = useState(initialPerson || people[0] || null);
  const [body, setBody] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { if (initialPerson) setSelected(initialPerson); }, [initialPerson]);
  useEffect(() => { if (!selected && people[0]) setSelected(people[0]); }, [people, selected]);
  const dm = useDirectMessages(user, selected);
  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [dm.messages]);
  return <section className="panel dm-shell"><div className="panel-title">Friends & private messages</div>{requests.length>0&&<div className="friend-requests"><strong>Friend requests</strong>{requests.map(row=><div key={row.id}><button className="user-link" onClick={()=>onViewProfile(row.person)}>{row.person.username}</button><button className="neon-button" onClick={()=>friendsApi.accept(row.id)}>Accept</button><button className="tiny-tool" onClick={()=>friendsApi.decline(row.id)}>Decline</button></div>)}</div>}<div className="dm-layout">
    <aside className="dm-people"><div className="dm-subtitle">Your friends</div>{!people.length&&<p className="dm-note">Add friends before sending DMs.</p>}{people.map(person=><button key={person.id} className={`dm-person ${selected?.id===person.id?'active':''}`} onClick={()=>setSelected(person)}><Avatar profile={person} showFrame={chatFramesEnabled}/><span><strong>{person.username}</strong><small>{person.mood||'online'}</small></span></button>)}</aside>
    <div className="dm-conversation">{selected?<><div className="dm-subtitle">Conversation with <button className="text-button light-link" onClick={()=>onViewProfile(selected)}>{selected.username}</button></div><div className="dm-scroll">{!dm.messages.length&&<div className="empty-chat">No messages yet. Say hi!</div>}{dm.messages.map(message=><article key={message.id} className={`dm-message ${message.sender_id===user.id?'mine':''}`}><strong>{message.sender_id===user.id?'You':selected.username}</strong><span>{new Date(message.created_at).toLocaleString()}</span><p>{message.body}</p></article>)}<div ref={endRef}/></div><form className="composer dm-compose" onSubmit={async(e)=>{e.preventDefault();if(await dm.send(body))setBody('')}}><div className="composer-tools"><button type="button" className="tiny-tool" onClick={()=>setShowEmoji(v=>!v)}>☺ emojis</button></div>{showEmoji&&<EmojiPicker onPick={(emoji)=>setBody(v=>v+emoji)}/>}<div className="composer-row"><textarea maxLength="1000" value={body} onChange={e=>setBody(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form.requestSubmit()}}} placeholder={`Message ${selected.username}...`}/><button className="glossy-button green">Send »</button></div><div className="composer-foot"><span>Enter sends · Shift+Enter makes a new line</span><span>{dm.status}</span></div></form></>:<div className="empty-chat">Choose a friend to start a private conversation.</div>}</div>
  </div></section>;
}
