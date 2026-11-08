// Mock-auth helpers used by ClassroomStore. Passwords are only ever stored as
// SHA-256 hashes in memory. Replace with real auth API calls once the backend exists.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Personal email providers can't be used to register an institution.
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com',
];

export const emailDomainOf = (email) => (email.split('@')[1] || '').toLowerCase();

export async function hashPassword(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
