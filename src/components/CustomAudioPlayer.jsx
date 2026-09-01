import { useEffect, useRef, useState } from 'react';

function clock(value) {
  if (!Number.isFinite(value)) return '0:00';
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

export default function CustomAudioPlayer({ src, title='Profile song', styleName='terminal', autoStart=false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(.8);
  useEffect(() => {
    const audio=audioRef.current;
    if(audio&&autoStart) void audio.play().then(()=>setPlaying(true)).catch(()=>{});
  }, [autoStart, src]);
  function toggle(){const audio=audioRef.current;if(!audio)return;if(audio.paused)void audio.play().then(()=>setPlaying(true)).catch(()=>{});else{audio.pause();setPlaying(false)}}
  return <div className={`custom-player player-${styleName}`}>
    <audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={e=>setDuration(e.currentTarget.duration)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onEnded={()=>setPlaying(false)}/>
    <div className="player-display"><span>♪ {title}</span><span>{clock(time)} / {clock(duration)}</span></div>
    <div className="player-controls"><button type="button" onClick={toggle}>{playing?'Ⅱ':'▶'}</button><input aria-label="Song position" type="range" min="0" max={duration||0} step=".1" value={Math.min(time,duration||0)} onChange={e=>{const next=Number(e.target.value);audioRef.current.currentTime=next;setTime(next)}}/><span>VOL</span><input className="volume" aria-label="Volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>{const next=Number(e.target.value);setVolume(next);audioRef.current.volume=next}}/></div>
  </div>;
}
