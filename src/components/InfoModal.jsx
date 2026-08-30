import { useEffect } from 'react';

export default function InfoModal({ info, onClose }) {
  useEffect(() => {
    if (!info) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [info, onClose]);
  if (!info) return null;
  return <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close" onClick={onClose}>×</button><h2 id="modal-title">{info.title}</h2><p>{info.text}</p></section></div>;
}
