import { useEffect, useRef, useState } from 'react';

function Message({ message }) {
  const username = message.profile?.username || 'Unknown user';
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return <article className="message"><div className="mini-avatar">{username.charAt(0).toUpperCase()}</div><div className="message-content"><div className="message-meta"><a href="#profile">{username}</a><span>{time}</span></div><p>{message.body}</p></div></article>;
}

export default function ChatRoom({ messages, status, onSend }) {
  const [body, setBody] = useState('');
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);
  async function submit(event) { event.preventDefault(); if (await onSend(body)) setBody(''); }

  return <section className="content-column">
    <div className="update-bar"><strong>{messages.length}</strong> messages in <b>#lobby</b> <span>Last Login: Right Now</span></div>
    <div className="network-box"><h2>Symbiosis Realtime Messaging</h2><p><b>{messages.length}</b> messages · <span>Public lobby</span> · Everyone can see what you post.</p></div>
    <div className="section-heading blue">#lobby's Latest Messages</div>
    <div className="chat-window" aria-live="polite">
      {!messages.length && <div className="empty"><b>No messages yet!</b><br/>Be the first person to say something. ★</div>}
      {messages.map((message) => <Message key={message.id} message={message}/>)}<div ref={endRef}/>
    </div>
    <form className="composer" onSubmit={submit}>
      <div className="composer-title">Post a new message</div>
      <div className="format-row"><button type="button" onClick={() => setBody((v) => `${v}${v ? ' ' : ''}:)`)}>☺ smile</button><button type="button" onClick={() => setBody((v) => `${v}${v ? ' ' : ''}<3`)}>♥ heart</button><span>500 characters max</span></div>
      <textarea maxLength="500" value={body} placeholder="Type your message here..." onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }}/>
      <div className="send-row"><span role="status">{status}</span><button className="web-button">POST MESSAGE</button></div>
    </form>
    <div className="friends-box"><div className="section-heading orange">Symbiosis is in your extended network</div><p><b>★ Thanks for stopping by! ★</b><br/>The Internet is better when your friends are here.</p></div>
  </section>;
}
