export function initials(name = '?') {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

export function safeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

export function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
