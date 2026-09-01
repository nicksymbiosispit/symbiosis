import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import EmojiPicker from './EmojiPicker.jsx';

function Message({ message, onViewProfile, onReport, currentUsername }) {
  const username = message.profile?.username || 'Unknown user';
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const parts=message.body.split(/(@[A-Za-z0-9_-]+)/g);
  return <article className="message"><Avatar profile={message.profile}/><div><div className="message-head">{message.profile?.id ? <button className="message-user user-link" onClick={() => onViewProfile(message.profile)}>{username}</button> : <span className="message-user">{username}</span>}{message.profile?.role==='moderator'&&<span className="mod-badge">MOD</span>}<span className="message-time">{time}</span><button className="report-link" title="Report message" onClick={()=>onReport(message)}>⚑ report</button></div><div className="message-body">{parts.map((part,index)=>part.startsWith('@')?<mark className={part.slice(1).toLowerCase()===currentUsername?.toLowerCase()?'mention mine':'mention'} key={index}>{part}</mark>:part)}</div></div></article>;
}

export default function ChatRoom({ room='lobby', currentUsername, messages, status, onSend, onViewProfile, onReport, onSlowMode, pingsEnabled, onEnablePings, slowModeSeconds=0, lastSentAt, serverRemaining=0, isModerator=false }) {
  const [body, setBody] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [now, setNow] = useState(Date.now());
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(()=>{ if(!slowModeSeconds||isModerator)return; const id=setInterval(()=>setNow(Date.now()),500); return()=>clearInterval(id); },[slowModeSeconds,isModerator]);
  const serverDeadline = useRef(Date.now() + serverRemaining * 1000);
  useEffect(()=>{ serverDeadline.current=Date.now()+serverRemaining*1000; setNow(Date.now()); },[serverRemaining]);
  const localRemaining = !lastSentAt ? 0 : Math.ceil((lastSentAt + slowModeSeconds*1000 - now)/1000);
  const remaining = isModerator ? 0 : Math.max(0, localRemaining, Math.ceil((serverDeadline.current-now)/1000));
  async function submit(event) {
    event.preventDefault();
    if (typeof onSend !== 'function' || remaining) return;
    const command = body.trim().match(/^\/slowmode(?:\s+(\d+))?$/i);
    if (command && isModerator) {
      const seconds = Number(command[1] ?? 0);
      if (await onSlowMode(seconds)) setBody('');
      return;
    }
    if (await onSend(body)) setBody('');
  }

  return <section className="chat-column"><div className="panel chat-panel"><div className="panel-title chat-title"><span><span className="room-dot"/> #{room}</span><span className="tiny-meta">{messages.length} message{messages.length===1?'':'s'}</span></div>
    {slowModeSeconds>0&&<div className="slow-banner">⏱ Slow mode: {slowModeSeconds}s {isModerator&&'· moderator bypass'}</div>}<div className="chat-scroll" aria-live="polite">{!messages.length && <div className="empty-chat"><div><div style={{fontSize:28}}>✦</div><strong>No messages yet.</strong><div>Be the first person to say something.</div></div></div>}{messages.map((message)=><Message key={message.id} message={message} currentUsername={currentUsername} onViewProfile={onViewProfile} onReport={onReport}/>)}<div ref={endRef}/></div>
    <form className="composer" onSubmit={submit}><div className="composer-tools"><span className="smiley">☺</span><button type="button" className="tiny-tool" onClick={()=>setShowEmoji(v=>!v)}>emojis</button><button type="button" className="tiny-tool" onClick={()=>setBody(v=>`${v}${v&&!v.endsWith(' ')?' ':''}<3`)}>heart</button>{!pingsEnabled&&<button type="button" className="tiny-tool" onClick={onEnablePings}>enable @ pings</button>}</div>{showEmoji&&<EmojiPicker onPick={(emoji)=>setBody(v=>v+emoji)}/>} 
      <div className="composer-row"><textarea maxLength="500" value={body} placeholder={remaining?`Slow mode — wait ${remaining}s`:'Type a message...'} onChange={(e)=>setBody(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form.requestSubmit()}}}/><button className="glossy-button green" disabled={Boolean(remaining)}>{remaining?`${remaining}s`:'Send »'}</button></div><div className="composer-foot"><span>{isModerator?'Use /slowmode seconds · ':''}Enter sends · Shift+Enter makes a new line</span><span role="status">{status}</span></div></form>
  </div><div className="ad-strip"><span className="ad-star">✦</span><strong>YOU ARE CURRENTLY VIEWING THE INTERNET.</strong><span>Make it memorable.</span><span className="ad-sparkle">✦ ✧ ✦</span></div>
  </section>;
}
