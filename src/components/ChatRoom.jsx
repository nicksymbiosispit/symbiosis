import { useEffect, useRef, useState } from 'react';

function Message({ message }) {
  const username = message.profile?.username || 'Unknown user';
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return <article className="message"><div className="message-avatar">{username.charAt(0).toUpperCase()}</div><div><div className="message-head"><span className="message-user">{username}</span><span className="message-time">{time}</span></div><div className="message-body">{message.body}</div></div></article>;
}

export default function ChatRoom({ messages, status, onSend }) {
  const [body, setBody] = useState('');
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  async function submit(event) {
    event.preventDefault();
    if (typeof onSend !== 'function') return;
    if (await onSend(body)) setBody('');
  }

  return <section className="chat-column"><div className="panel chat-panel"><div className="panel-title chat-title"><span><span className="room-dot"/> #lobby</span><span className="tiny-meta">{messages.length} message{messages.length===1?'':'s'}</span></div>
    <div className="chat-scroll" aria-live="polite">{!messages.length && <div className="empty-chat"><div><div style={{fontSize:28}}>✦</div><strong>No messages yet.</strong><div>Be the first person to say something.</div></div></div>}{messages.map((message)=><Message key={message.id} message={message}/>)}<div ref={endRef}/></div>
    <form className="composer" onSubmit={submit}><div className="composer-tools"><span className="smiley">☺</span><button type="button" className="tiny-tool" onClick={()=>setBody(v=>`${v}${v&&!v.endsWith(' ')?' ':''}:)`)}>smile</button><button type="button" className="tiny-tool" onClick={()=>setBody(v=>`${v}${v&&!v.endsWith(' ')?' ':''}<3`)}>heart</button></div>
      <div className="composer-row"><input maxLength="500" value={body} placeholder="Type a message..." autoComplete="off" onChange={(e)=>setBody(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form.requestSubmit()}}}/><button className="glossy-button green">Send »</button></div><div className="composer-foot"><span>Enter sends</span><span role="status">{status}</span></div></form>
  </div><div className="ad-strip"><span className="ad-star">✦</span><strong>YOU ARE CURRENTLY VIEWING THE INTERNET.</strong><span>Make it memorable.</span><span className="ad-sparkle">✦ ✧ ✦</span></div>
  </section>;
}
