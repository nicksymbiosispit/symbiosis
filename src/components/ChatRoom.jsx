import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import EmojiPicker from './EmojiPicker.jsx';

function Message({ message, onViewProfile, onReport, currentUsername, mentionUsers }) {
  const username = message.profile?.username || 'Unknown user';
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const parts=message.body.split(/(@[A-Za-z0-9_-]+)/g);
  return <article className="message"><Avatar profile={message.profile}/><div><div className="message-head">{message.profile?.id ? <button className="message-user user-link" onClick={() => onViewProfile(message.profile)}>{username}</button> : <span className="message-user">{username}</span>}{message.profile?.role==='moderator'&&<span className="mod-badge">MOD</span>}<span className="message-time">{time}</span><button className="report-link" title="Report message" onClick={()=>onReport(message)}>⚑ report</button></div><div className="message-body">{parts.map((part,index)=>{const person=part.startsWith('@')?mentionUsers.find(user=>user.username.toLowerCase()===part.slice(1).toLowerCase()):null;return person?<button type="button" className={person.username.toLowerCase()===currentUsername?.toLowerCase()?'mention mine':'mention'} key={index} onClick={()=>onViewProfile(person)}>{part}</button>:part})}</div></div></article>;
}

export default function ChatRoom({ room='lobby', currentUsername, mentionUsers=[], messages, status, onSend, onViewProfile, onReport, onSlowMode, pingsEnabled, onEnablePings, slowModeSeconds=0, lastSentAt, serverRemaining=0, isModerator=false }) {
  const [body, setBody] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [mentionIndex, setMentionIndex] = useState(0);
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(()=>{ if(!slowModeSeconds||isModerator)return; const id=setInterval(()=>setNow(Date.now()),500); return()=>clearInterval(id); },[slowModeSeconds,isModerator]);
  const serverDeadline = useRef(Date.now() + serverRemaining * 1000);
  useEffect(()=>{ serverDeadline.current=Date.now()+serverRemaining*1000; setNow(Date.now()); },[serverRemaining]);
  const localRemaining = !lastSentAt ? 0 : Math.ceil((lastSentAt + slowModeSeconds*1000 - now)/1000);
  const remaining = isModerator ? 0 : Math.max(0, localRemaining, Math.ceil((serverDeadline.current-now)/1000));
  const mentionMatch=body.match(/(^|\s)@([A-Za-z0-9_-]*)$/);
  const mentionOptions=mentionMatch?[...new Map(mentionUsers.map(person=>[person.id,person])).values()].filter(person=>person.username.toLowerCase().startsWith(mentionMatch[2].toLowerCase())).slice(0,6):[];
  function insertMention(person){if(!mentionMatch)return;setBody(`${body.slice(0,mentionMatch.index)}${mentionMatch[1]}@${person.username} `);setMentionIndex(0)}
  function composerKeyDown(event){
    if(mentionOptions.length){if(event.key==='ArrowDown'){event.preventDefault();setMentionIndex(index=>(index+1)%mentionOptions.length);return}if(event.key==='ArrowUp'){event.preventDefault();setMentionIndex(index=>(index-1+mentionOptions.length)%mentionOptions.length);return}if(event.key==='Escape'){event.preventDefault();setBody(value=>`${value} `);return}if((event.key==='Enter'&&!event.shiftKey)||event.key==='Tab'){event.preventDefault();insertMention(mentionOptions[mentionIndex]||mentionOptions[0]);return}}
    if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form.requestSubmit()}
  }
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
    {slowModeSeconds>0&&<div className="slow-banner">Slow mode: {slowModeSeconds}s {isModerator&&'· moderator bypass'}</div>}<div className="chat-scroll" aria-live="polite">{!messages.length && <div className="empty-chat"><strong>No messages in #{room}.</strong> Start the conversation.</div>}{messages.map((message)=><Message key={message.id} message={message} currentUsername={currentUsername} mentionUsers={mentionUsers} onViewProfile={onViewProfile} onReport={onReport}/>)}<div ref={endRef}/></div>
    <form className="composer" onSubmit={submit}><div className="composer-tools"><span className="smiley">☺</span><button type="button" className="tiny-tool" onClick={()=>setShowEmoji(v=>!v)}>emojis</button><button type="button" className="tiny-tool" onClick={()=>setBody(v=>`${v}${v&&!v.endsWith(' ')?' ':''}<3`)}>heart</button>{!pingsEnabled&&<button type="button" className="tiny-tool" onClick={onEnablePings}>enable @ pings</button>}</div>{showEmoji&&<EmojiPicker onPick={(emoji)=>setBody(v=>v+emoji)}/>} 
      <div className="composer-wrap">{mentionOptions.length>0&&<div className="mention-menu" role="listbox">{mentionOptions.map((person,index)=><button type="button" role="option" aria-selected={index===mentionIndex} className={index===mentionIndex?'active':''} key={person.id} onMouseDown={event=>event.preventDefault()} onClick={()=>insertMention(person)}><Avatar profile={person}/><span><b>{person.username}</b><small>{person.mood||'member'}</small></span></button>)}</div>}<div className="composer-row"><textarea maxLength="500" value={body} placeholder={remaining?`Slow mode — wait ${remaining}s`:'Type a message...'} onChange={(e)=>{setBody(e.target.value);setMentionIndex(0)}} onKeyDown={composerKeyDown}/><button className="glossy-button green" disabled={Boolean(remaining)}>{remaining?`${remaining}s`:'Send'}</button></div></div><div className="composer-foot"><span>{isModerator?'/slowmode seconds · ':''}Enter sends · Shift+Enter adds a line</span><span role="status">{status}</span></div></form>
  </div>
  </section>;
}
