import { useEffect, useRef, useState } from 'react';

export const BUILT_IN_TRACKS = [
  { id:'', title:'No built-in track' },
  { id:'neon-dialup', title:'Neon Dial-Up' },
  { id:'pixel-hearts', title:'Pixel Hearts' },
  { id:'midnight-status', title:'Midnight Status' },
  { id:'crt-dreams', title:'CRT Dreams' }
];

const SONGS = {
  'neon-dialup': { tempo:150, wave:'square', notes:[72,76,79,84,79,76,74,79] },
  'pixel-hearts': { tempo:125, wave:'triangle', notes:[60,64,67,71,67,64,62,67] },
  'midnight-status': { tempo:92, wave:'sine', notes:[48,55,51,58,53,60,55,62] },
  'crt-dreams': { tempo:108, wave:'sawtooth', notes:[57,64,60,67,62,69,64,71] }
};

function frequency(note) { return 440 * Math.pow(2, (note - 69) / 12); }

export default function ProfileMusic({ trackId, autoStart=false }) {
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(()=>{});
  function stop() { stopRef.current(); setPlaying(false); }
  function play() {
    stop(); const song=SONGS[trackId]; if(!song)return;
    const AudioContext=window.AudioContext||window.webkitAudioContext; if(!AudioContext)return;
    const context=new AudioContext(); const master=context.createGain(); master.gain.value=.055; master.connect(context.destination);
    const beat=60/song.tempo; const started=context.currentTime+.04; const oscillators=[];
    [...song.notes,...song.notes].forEach((note,index)=>{const oscillator=context.createOscillator();const gain=context.createGain();oscillator.type=song.wave;oscillator.frequency.value=frequency(note);const at=started+index*beat/2;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+beat*.44);oscillator.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+beat*.48);oscillators.push(oscillator);});
    const timer=setTimeout(()=>{void context.close();setPlaying(false)},(song.notes.length*2*beat/2+.2)*1000);
    stopRef.current=()=>{clearTimeout(timer);oscillators.forEach(o=>{try{o.stop()}catch{}});void context.close();}; setPlaying(true);
  }
  useEffect(()=>{if(autoStart&&trackId)play();return stop},[trackId]);
  if(!trackId)return null;
  return <button type="button" className="tiny-tool music-button" onClick={playing?stop:play}>{playing?'■ Stop':'▶ Play'} built-in track</button>;
}
