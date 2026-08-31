import { useState } from 'react';

export default function ReportDialog({ target, onSubmit, onClose }) {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  if (!target) return null;
  async function submit(event) {
    event.preventDefault();
    if (reason.trim().length < 3) return;
    setSending(true);
    const ok = await onSubmit({ userId: target.userId, messageId: target.messageId, reason });
    setSending(false);
    if (ok) onClose();
  }
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Report content"><form className="modal-card report-card" onSubmit={submit}><button type="button" className="modal-close" onClick={onClose}>×</button><h2>⚑ Report {target.label}</h2><p>Tell the moderators what happened. Reports are private.</p><textarea autoFocus maxLength="500" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe the problem…"/><button className="glossy-button green" disabled={sending || reason.trim().length < 3}>{sending ? 'Sending…' : 'Send report »'}</button></form></div>;
}
