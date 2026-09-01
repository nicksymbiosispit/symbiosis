import { useEffect, useRef, useState } from 'react';

export const STICKER_CHOICES = [
  '⭐','🌟','✨','💫','🌈','☀️','🌙','☁️','⚡','🔥','💧','❄️','🌸','🌺','🌻','🌹','🍀','🍄','🌵','🌴',
  '❤️','💚','💙','💜','🖤','💔','💖','💿','📼','📺','☎️','💾','🖥️','⌨️','🎧','🎸','🎹','🎤','🎵','🎶',
  '👽','👻','💀','🤖','😈','😎','🤩','🥳','🦋','🐸','🐈','🐕','🐇','🐍','🐉','🦄','🐬','🦖','🐝','🐞',
  '🍒','🍓','🍉','🍕','🍭','🍬','🧁','☕','🛸','🚀','🛹','🎲','🎮','🕹️','🎱','👑','💎','🔮','🧿','☮️',
  '☯️','✌️','🤘','💅','🪩','📷','💌','🔒','🔑','⚠️','❗','✅','❌','♠️','♥️','♦️','♣️','©️','™️','㋡'
];

export function ProfileStickers({ stickers=[] }) {
  return <div className="profile-sticker-layer" aria-hidden="true">{stickers.map(sticker=><span key={sticker.id} className="profile-sticker" style={{left:`${sticker.x}%`,top:`${sticker.y}%`,fontSize:`${sticker.size}px`,transform:`translate(-50%,-50%) rotate(${sticker.rotation}deg)`}}>{sticker.glyph}</span>)}</div>;
}

export default function StickerEditor({ stickers=[], onChange }) {
  const canvasRef=useRef(null); const [dragging,setDragging]=useState(null); const [selected,setSelected]=useState(null);
  useEffect(()=>{function move(event){if(!dragging||!canvasRef.current)return;const rect=canvasRef.current.getBoundingClientRect();const x=Math.max(2,Math.min(98,(event.clientX-rect.left)/rect.width*100));const y=Math.max(3,Math.min(97,(event.clientY-rect.top)/rect.height*100));onChange(stickers.map(item=>item.id===dragging?{...item,x,y}:item))}function up(){setDragging(null)}window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}},[dragging,stickers,onChange]);
  function add(glyph){if(stickers.length>=40)return;const sticker={id:`s-${Date.now()}-${Math.random().toString(16).slice(2)}`,glyph,x:50,y:50,size:42,rotation:0};onChange([...stickers,sticker]);setSelected(sticker.id)}
  const current=stickers.find(item=>item.id===selected);
  function update(changes){onChange(stickers.map(item=>item.id===selected?{...item,...changes}:item))}
  return <section className="sticker-customizer"><h3>Stick stuff on my profile</h3><p>Pick a sticker, then drag it anywhere on the canvas.</p><div className="sticker-palette">{STICKER_CHOICES.map((glyph,index)=><button type="button" key={`${glyph}-${index}`} onClick={()=>add(glyph)}>{glyph}</button>)}</div><div ref={canvasRef} className="sticker-canvas">{stickers.map(sticker=><button type="button" key={sticker.id} className={`editable-sticker ${selected===sticker.id?'selected':''}`} onPointerDown={event=>{event.preventDefault();setSelected(sticker.id);setDragging(sticker.id)}} style={{left:`${sticker.x}%`,top:`${sticker.y}%`,fontSize:`${sticker.size}px`,transform:`translate(-50%,-50%) rotate(${sticker.rotation}deg)`}}>{sticker.glyph}</button>)}</div>{current&&<div className="sticker-controls"><label>Size <input type="range" min="20" max="100" value={current.size} onChange={e=>update({size:Number(e.target.value)})}/></label><label>Rotation <input type="range" min="-180" max="180" value={current.rotation} onChange={e=>update({rotation:Number(e.target.value)})}/></label><button type="button" className="tiny-tool danger" onClick={()=>{onChange(stickers.filter(item=>item.id!==selected));setSelected(null)}}>Remove sticker</button></div>}</section>;
}
