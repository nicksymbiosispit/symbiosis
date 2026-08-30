import { useEffect } from 'react';

export default function InfoModal({ info, onClose }) {
  useEffect(() => {
    if (!info) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [info, onClose]);
  if (!info) return null;
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close" onClick={onClose}>×</button><div className="section-heading blue" id="modal-title">{info.title}</div><p>{info.text}</p><button className="web-button" onClick={onClose}>OK</button></section></div>;
}
