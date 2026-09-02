import { useRef, useState } from 'react';

export const STICKER_CATALOG = [
  {id:'skull',label:'SKULL',art:'☠'}, {id:'star',label:'STAR',art:'★'},
  {id:'heart',label:'HEART',art:'♥'}, {id:'spark',label:'SPARK',art:'✦'},
  {id:'hazard',label:'RAD',art:'☢'}, {id:'alien',label:'ALIEN',art:'[::]'},
  {id:'pixel',label:'8 BIT',art:'8-BIT'}, {id:'lol',label:'LOL',art:'LOL!'},
  {id:'brb',label:'BRB',art:'BRB'}, {id:'rawr',label:'RAWR',art:'RAWR!'},
  {id:'online',label:'ONLINE',art:'ONLINE'}, {id:'angel',label:'ANGEL',art:'O:-)'},
  {id:'devil',label:'DEVIL',art:'}:‑)'}, {id:'broken',label:'BROKEN',art:'<\\3'},
  {id:'music',label:'MUSIC',art:'♫'}, {id:'xeyes',label:'X EYES',art:'x_x'},
  {id:'web',label:'WWW',art:'WWW'}, {id:'mail',label:'MAIL',art:'@_@'}
];

function safeStickers(value){return Array.isArray(value)?value.slice(0,30).filter(item=>item&&STICKER_CATALOG.some(entry=>entry.id===item.type)&&Number.isFinite(item.x)&&Number.isFinite(item.y)):[]}

export function StickerLayer({stickers=[],editable=false,selectedId,onSelect,onMove}){
  const layerRef=useRef(null);
  function begin(event,sticker){
    if(!editable)return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);onSelect(sticker.id);
  }
  function move(event,sticker){
    if(!editable||!event.currentTarget.hasPointerCapture(event.pointerId))return;
    const box=layerRef.current.getBoundingClientRect();
    onMove(sticker.id,Math.max(2,Math.min(98,(event.clientX-box.left)/box.width*100)),Math.max(3,Math.min(97,(event.clientY-box.top)/box.height*100)));
  }
  return <div ref={layerRef} className={`profile-sticker-layer ${editable?'editable':''}`}>{safeStickers(stickers).map(sticker=>{const item=STICKER_CATALOG.find(entry=>entry.id===sticker.type);const color=/^#[0-9a-f]{6}$/i.test(sticker.color||'')?sticker.color:null;return <button type="button" key={sticker.id} className={`profile-sticker sticker-${sticker.type} ${selectedId===sticker.id?'selected':''}`} style={{left:`${sticker.x}%`,top:`${sticker.y}%`,color:color||undefined,borderColor:color||undefined,transform:`translate(-50%,-50%) rotate(${sticker.rotation||0}deg) scale(${sticker.scale||1})`}} onPointerDown={event=>begin(event,sticker)} onPointerMove={event=>move(event,sticker)} onClick={()=>editable&&onSelect(sticker.id)} tabIndex={editable?0:-1}>{item.art}</button>})}</div>;
}

export default function StickerEditor({stickers=[],onChange,children}){
  const [selectedId,setSelectedId]=useState(null);
  const safe=safeStickers(stickers);
  function add(type){if(safe.length>=30)return;const id=`${Date.now()}-${Math.random().toString(16).slice(2)}`;onChange([...safe,{id,type,x:50,y:50,rotation:0,scale:1,color:'#39ff14'}]);setSelectedId(id)}
  function patch(id,changes){onChange(safe.map(item=>item.id===id?{...item,...changes}:item))}
  const selected=safe.find(item=>item.id===selectedId);
  return <div className="sticker-workbench"><div className="sticker-preview-stage">{children}<StickerLayer stickers={safe} editable selectedId={selectedId} onSelect={setSelectedId} onMove={(id,x,y)=>patch(id,{x,y})}/></div><div className="sticker-toolbar"><b>Sticker drawer</b><span>Click to add · drag it on the preview</span><div className="sticker-palette">{STICKER_CATALOG.map(item=><button type="button" className={`palette-sticker sticker-${item.id}`} key={item.id} onClick={()=>add(item.id)} title={`Add ${item.label}`}>{item.art}</button>)}</div>{selected&&<div className="sticker-controls"><label className="sticker-color">Sticker color<input type="color" value={/^#[0-9a-f]{6}$/i.test(selected.color||'')?selected.color:'#39ff14'} onChange={event=>patch(selected.id,{color:event.target.value})}/></label><button type="button" onClick={()=>patch(selected.id,{rotation:(selected.rotation||0)-15})}>↶ rotate</button><button type="button" onClick={()=>patch(selected.id,{rotation:(selected.rotation||0)+15})}>rotate ↷</button><button type="button" onClick={()=>patch(selected.id,{scale:Math.max(.6,(selected.scale||1)-.15)})}>smaller</button><button type="button" onClick={()=>patch(selected.id,{scale:Math.min(2,(selected.scale||1)+.15)})}>bigger</button><button type="button" className="danger" onClick={()=>{onChange(safe.filter(item=>item.id!==selected.id));setSelectedId(null)}}>remove</button></div>}<small>{safe.length}/30 stickers</small></div></div>;
}
