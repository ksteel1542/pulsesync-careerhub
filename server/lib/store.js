// Minimal persistent store: a JSON file in server/data/ (gitignored).
// Writes are serialized through a queue and land atomically (write temp → rename),
// so concurrent webhooks can't corrupt the file. Swap this module for a real
// database before production; the rest of the server only calls these functions.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const FILE = path.join(config.dataDir, 'subscriptions.json');
const MAX_EVENT_IDS = 2000;

let cache = null;
let queue = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'));
    // Prototype-free maps: a key like "__proto__" is stored as plain data, never as a prototype
    cache = {
      users: Object.assign(Object.create(null), parsed.users),
      institutions: Object.assign(Object.create(null), parsed.institutions),
      processedEvents: parsed.processedEvents ?? [],
    };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    cache = { users: Object.create(null), institutions: Object.create(null), processedEvents: [] };
  }
  return cache;
}

async function save() {
  await fs.mkdir(config.dataDir, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(cache, null, 2));
  await fs.rename(tmp, FILE);
}

/** Run `fn(db)` exclusively, then persist. Returns fn's result. */
function transact(fn) {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save();
    return result;
  });
  queue = run.catch(() => {}); // keep the chain alive after a failure
  return run;
}

/**
 * Apply a paid plan exactly once per provider event.
 * @returns {Promise<boolean>} false if this event was already processed
 */
export function applyEntitlement({ eventId, provider, scope, planTier, billingCycle, userId, userEmail, institutionId, status = 'active' }) {
  return transact((db) => {
    if (db.processedEvents.includes(eventId)) return false;
    const subscription = { tier: planTier, billingCycle, provider, status, updatedAt: new Date().toISOString() };
    if (scope === 'institution') {
      db.institutions[institutionId] = { ...db.institutions[institutionId], subscription, billingContact: userEmail };
    } else {
      db.users[userId] = { ...db.users[userId], email: userEmail, subscription };
    }
    db.processedEvents.push(eventId);
    if (db.processedEvents.length > MAX_EVENT_IDS) db.processedEvents.splice(0, db.processedEvents.length - MAX_EVENT_IDS);
    return true;
  });
}

export async function getUserSubscription(userId) {
  const db = await load();
  return db.users[userId]?.subscription ?? null;
}

export async function getInstitutionSubscription(institutionId) {
  const db = await load();
  return db.institutions[institutionId]?.subscription ?? null;
}
