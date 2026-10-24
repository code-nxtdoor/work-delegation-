export const AVAILABILITY = {
  5: { label: 'Open', tone: 'ok' },
  4: { label: 'Light load', tone: 'ok' },
  3: { label: 'Some room', tone: 'warn' },
  2: { label: 'Stretched', tone: 'caution' },
  1: { label: 'Full', tone: 'error' }
};

export const STATUS = {
  new: { label: 'Interest open', tag: 'purple' },
  progress: { label: 'In progress', tag: 'green' },
  hold: { label: 'On hold', tag: 'warm-gray' },
  done: { label: 'Done', tag: 'gray' }
};

export const initials = name => name.replace(/\(.*\)/, '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

export function timeLeft(date) {
  if (!date) return '';
  const ms = new Date(date) - Date.now();
  if (ms <= 0) return 'Window closed';
  const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
  return `${h}h ${String(m).padStart(2, '0')}m left`;
}

export function ago(date) {
  if (!date) return 'never';
  const s = (Date.now() - new Date(date)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
