import React, { useState } from 'react';

const SIZES = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-2xl',
};

const initialsOf = (name = '') =>
  name
    .replace(/^(Dr\.|Prof\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Shows the user's avatar image, falling back to initials if missing or broken. */
export default function Avatar({ name, src, size = 'md', className = '' }) {
  // Remember which src failed so a new src gets a fresh attempt
  const [brokenSrc, setBrokenSrc] = useState(null);

  const base = `${SIZES[size]} rounded-full shrink-0 object-cover ${className}`;
  if (src && brokenSrc !== src) {
    return <img src={src} alt={name ? `${name}'s avatar` : ''} onError={() => setBrokenSrc(src)} className={base} />;
  }
  return (
    <span aria-hidden="true" className={`${base} inline-flex items-center justify-center font-black bg-indigo-600/30 text-indigo-300`}>
      {initialsOf(name)}
    </span>
  );
}
