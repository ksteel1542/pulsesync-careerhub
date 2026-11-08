// Preset profile avatars, generated as inline SVG data URIs so they work offline
// and need no external image host.
const make = (from, to, glyph) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="32" y="43" font-size="30" text-anchor="middle" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${glyph}</text></svg>`
  )}`;

export const PRESET_AVATARS = [
  { id: 'owl', label: 'Owl', url: make('#6366f1', '#a855f7', '🦉') },
  { id: 'fox', label: 'Fox', url: make('#f97316', '#ef4444', '🦊') },
  { id: 'rocket', label: 'Rocket', url: make('#0ea5e9', '#6366f1', '🚀') },
  { id: 'books', label: 'Books', url: make('#10b981', '#0d9488', '📚') },
  { id: 'atom', label: 'Atom', url: make('#06b6d4', '#3b82f6', '⚛️') },
  { id: 'palette', label: 'Palette', url: make('#ec4899', '#f43f5e', '🎨') },
  { id: 'globe', label: 'Globe', url: make('#22c55e', '#14b8a6', '🌍') },
  { id: 'bulb', label: 'Light bulb', url: make('#eab308', '#f97316', '💡') },
];
