const GOLF_WORDS = [
  'ace',
  'birdie',
  'bogey',
  'bunker',
  'chip',
  'eagle',
  'green',
  'hook',
  'iron',
  'links',
  'loft',
  'pars',
  'pitch',
  'putt',
  'rough',
  'score',
  'slice',
  'swing',
  'tee',
  'wedge',
  'wood',
];

export function generateInviteCode(): string {
  const word =
    GOLF_WORDS[Math.floor(Math.random() * GOLF_WORDS.length)].toUpperCase();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${word}-${suffix}`.toUpperCase();
}
