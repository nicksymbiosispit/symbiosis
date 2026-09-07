export function statusLabel(profile, isOnline) {
  const awayMessage = profile?.away_message?.trim();
  const mode = profile?.status_mode || 'online';

  if (!isOnline || mode === 'invisible') return awayMessage || 'Offline';
  if (mode === 'away') return awayMessage || 'Away';
  if (mode === 'busy') return awayMessage || 'Busy';
  return 'Online';
}
