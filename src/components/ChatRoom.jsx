import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import EmojiPicker from './EmojiPicker.jsx';
import { IMAGE_URL_PATTERN, mediaEmbed, uploadRoomMedia } from '../services/media.js';

function messageReference(value) { try { const url=new URL(value); const room=url.searchParams.get('room'); const messageId=url.searchParams.get('message'); return url.origin===window.location.origin&&['lobby','random','nostalgia'].includes(room)&&/^\d+$/.test(messageId||'')?{room,messageId}:null; } catch { return null; } }

function EmbeddedMedia({ url, username }) {
  const embed=mediaEmbed(url);
  const [menu,setMenu]=useState(null);
  useEffect(()=>{if(!menu)return;const close=()=>setMenu(null);window.addEventListener('click',close);window.addEventListener('blur',close);window.addEventListener('scroll',close,true);return()=>{window.removeEventListener('click',close);window.removeEventListener('blur',close);window.removeEventListener('scroll',close,true)}},[menu]);
  if(!embed)return null;
  async function copyLink(){try{await navigator.clipboard.writeText(url)}catch{const input=document.createElement('textarea');input.value=url;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove()}setMenu(null)}
  function openLink(){window.open(url,'_blank','noopener,noreferrer');setMenu(null)}
  function showMenu(event){event.preventDefault();event.stopPropagation();setMenu({x:Math.min(event.clientX,window.innerWidth-190),y:Math.min(event.clientY,window.innerHeight-82)})}
  return <div className="media-embed-wrap" onContextMenu={showMenu}><a className="media-embed-link" href={url} target="_blank" rel="noreferrer">{embed.type==='frame'?<><iframe className="media-embed media-frame" src={embed.src} title={`GIF posted by ${username}`} loading="lazy" allowFullScreen/><span className="media-frame-shield" aria-hidden="true"/></>:<img className="media-embed" src={embed.src} alt={`Media posted by ${username}`} loading="lazy"/>}</a>{menu&&<div className="media-context-menu" style={{left:menu.x,top:menu.y}} role="menu" onClick={event=>event.stopPropagation()}><button type="button" role="menuitem" onClick={copyLink}>Copy media link</button><button type="button" role="menuitem" onClick={openLink}>Open media link</button></div>}</div>;
}

function Message({ message, onViewProfile, onReport, onCopyLink, onJumpMessage, currentUsername, mentionUsers, chatFramesEnabled, linked, copied }) {
  const username = message.profile?.username || 'Unknown user';
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const parts=message.body.split(/(https?:\/\/[^\s]+|@[A-Za-z0-9_!@]+)/g);
  const directMessageReference=messageReference(message.body.trim());
  return <article id={`message-${message.id}`} className={`message ${linked?'linked-message':''}`}><Avatar profile={message.profile} showFrame={chatFramesEnabled}/><div><div className="message-head">{message.profile?.id ? <button className="message-user user-link" onClick={() => onViewProfile(message.profile)}>{username}</button> : <span className="message-user">{username}</span>}{message.profile?.role==='moderator'&&<span className="mod-badge">MOD</span>}<span className="message-time">{time}</span><button className="message-link" title="Copy message link" onClick={()=>onCopyLink(message.id)}>{copied?'copied':'link'}</button><button className="report-link" title="Report message" onClick={()=>onReport(message)}>⚑ report</button></div><div className="message-body">{directMessageReference?<button type="button" className="message-reference" title={'Jump to message in #'+directMessageReference.room} onClick={()=>onJumpMessage(directMessageReference.room,directMessageReference.messageId)}># {directMessageReference.room}</button>:IMAGE_URL_PATTERN.test(message.body)?<EmbeddedMedia url={message.body} username={username}/>:parts.map((part,index)=>{const reference=part.startsWith('http')?messageReference(part):null;if(reference)return <button type="button" className="message-reference" key={index} title={'Jump to message in #'+reference.room} onClick={()=>onJumpMessage(reference.room,reference.messageId)}># {reference.room}</button>;const person=part.startsWith('@')?mentionUsers.find(user=>user.username.toLowerCase()===part.slice(1).toLowerCase()):null;return person?<button type="button" className={person.username.toLowerCase()===currentUsername?.toLowerCase()?'mention mine':'mention'} key={index} onClick={()=>onViewProfile(person)}>{part}</button>:part})}</div></div></article>;
}

export default function ChatRoom({ room='lobby', userId, currentUsername, mentionUsers=[], chatFramesEnabled=true, targetMessageId=null, messages, status, onSend, onViewProfile, onReport, onJumpMessage, onSlowMode, pingsEnabled, onEnablePings, slowModeSeconds=0, lastSentAt, serverRemaining=0, isModerator=false }) {
  const [body, setBody] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [mentionIndex, setMentionIndex] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [mediaStatus, setMediaStatus] = useState('');
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(()=>{if(!targetMessageId)return;const node=document.getElementById(`message-${targetMessageId}`);if(node)window.setTimeout(()=>node.scrollIntoView({behavior:'smooth',block:'center'}),80)},[messages,targetMessageId]);
  useEffect(()=>{ if(!slowModeSeconds||isModerator)return; const id=setInterval(()=>setNow(Date.now()),500); return()=>clearInterval(id); },[slowModeSeconds,isModerator]);
  const serverDeadline = useRef(Date.now() + serverRemaining * 1000);
  useEffect(()=>{ serverDeadline.current=Date.now()+serverRemaining*1000; setNow(Date.now()); },[serverRemaining]);
  const localRemaining = !lastSentAt ? 0 : Math.ceil((lastSentAt + slowModeSeconds*1000 - now)/1000);
  const remaining = isModerator ? 0 : Math.max(0, localRemaining, Math.ceil((serverDeadline.current-now)/1000));
  const mediaOnly=room==='random'||room==='nostalgia';
  const mentionMatch=body.match(/(^|\s)@([A-Za-z0-9_!@]*)$/);
  const mentionOptions=mentionMatch?[...new Map(mentionUsers.map(person=>[person.id,person])).values()].filter(person=>person.username.toLowerCase().startsWith(mentionMatch[2].toLowerCase())).slice(0,6):[];
  function insertMention(person){if(!mentionMatch)return;setBody(`${body.slice(0,mentionMatch.index)}${mentionMatch[1]}@${person.username} `);setMentionIndex(0)}
  async function copyMessageLink(messageId){const url=new URL(window.location.href);url.search='';url.searchParams.set('room',room);url.searchParams.set('message',messageId);try{await navigator.clipboard.writeText(url.toString())}catch{const input=document.createElement('textarea');input.value=url.toString();document.body.appendChild(input);input.select();document.execCommand('copy');input.remove()}setCopiedMessageId(messageId);window.setTimeout(()=>setCopiedMessageId(null),1200)}
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
    if(mediaOnly&&!IMAGE_URL_PATTERN.test(body.trim())){setMediaStatus('Paste a media or GIF link—or upload a file.');return}
    if (await onSend(body)) setBody('');
  }
  async function chooseMedia(event){const file=event.target.files?.[0];if(!file)return;try{setMediaStatus('uploading…');const url=await uploadRoomMedia(userId,file);if(await onSend(url)){setMediaStatus('posted');window.setTimeout(()=>setMediaStatus(''),900)}}catch(error){setMediaStatus(error.message)}finally{event.target.value=''}}

  return <section className="chat-column"><div className="panel chat-panel"><div className="panel-title chat-title"><span><span className="room-dot"/> #{room}</span><span className="tiny-meta">{messages.length} message{messages.length===1?'':'s'}</span></div>
    {slowModeSeconds>0&&<div className="slow-banner">Slow mode: {slowModeSeconds}s {isModerator&&'· moderator bypass'}</div>}<div className="chat-scroll" aria-live="polite">{!messages.length && <div className="empty-chat"><strong>No messages in #{room}.</strong> Start the conversation.</div>}{messages.map((message)=><Message key={message.id} message={message} currentUsername={currentUsername} mentionUsers={mentionUsers} chatFramesEnabled={chatFramesEnabled} linked={String(message.id)===String(targetMessageId)} copied={copiedMessageId===message.id} onCopyLink={copyMessageLink} onJumpMessage={onJumpMessage} onViewProfile={onViewProfile} onReport={onReport}/>)}<div ref={endRef}/></div>
    <form className="composer" onSubmit={submit}><div className="composer-tools">{mediaOnly?<><label className="tiny-tool media-upload">upload image / GIF<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif" onChange={chooseMedia}/></label><span className="media-hint">or paste any image / GIF share link</span></>:<><span className="smiley">☺</span><button type="button" className="tiny-tool" onClick={()=>setShowEmoji(v=>!v)}>emojis</button><button type="button" className="tiny-tool" onClick={()=>setBody(v=>`${v}${v&&!v.endsWith(' ')?' ':''}<3`)}>heart</button>{!pingsEnabled&&<button type="button" className="tiny-tool" onClick={onEnablePings}>enable @ pings</button>}</>}</div>{!mediaOnly&&showEmoji&&<EmojiPicker onPick={(emoji)=>setBody(v=>v+emoji)}/>} 
      <div className="composer-wrap">{mentionOptions.length>0&&<div className="mention-menu" role="listbox">{mentionOptions.map((person,index)=><button type="button" role="option" aria-selected={index===mentionIndex} className={index===mentionIndex?'active':''} key={person.id} onMouseDown={event=>event.preventDefault()} onClick={()=>insertMention(person)}><Avatar profile={person}/><span><b>{person.username}</b><small>{person.mood||'member'}</small></span></button>)}</div>}<div className="composer-row"><textarea maxLength="500" value={body} placeholder={remaining?`Slow mode — wait ${remaining}s`:mediaOnly?'Paste image/GIF link…':'Type a message...'} onChange={(e)=>{setBody(e.target.value);setMentionIndex(0)}} onKeyDown={composerKeyDown}/><button className="glossy-button green" disabled={Boolean(remaining)}>{remaining?`${remaining}s`:'Send'}</button></div></div><div className="composer-foot"><span>{isModerator?'/slowmode seconds · ':''}Enter sends · Shift+Enter adds a line</span><span role="status">{mediaStatus||status}</span></div></form>
  </div>
  </section>;
}
