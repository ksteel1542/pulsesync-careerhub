import express from 'express';
import { config } from './lib/config.js';
import { providers } from './lib/providers.js';
import { paymentsRouter } from './routes/payments.js';
import { isDatabaseConfigured } from './services/db.js';

const app = express();
app.disable('x-powered-by');

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    database: isDatabaseConfigured() ? 'supabase' : 'NOT configured',
    providers: Object.fromEntries(Object.entries(providers).map(([name, p]) => [name, { checkout: p.isConfigured(), webhook: p.webhookConfigured() }])),
  })
);

// Body parsing is per-route inside the router: the webhook needs the raw body.
app.use('/api/payments', paymentsRouter());

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, config.host, () => {
  console.log(`PulseSync API listening on http://${config.host}:${config.port}`);
  console.log(`  database: ${isDatabaseConfigured() ? 'Supabase ready' : 'NOT configured (set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'}`);
  for (const [name, p] of Object.entries(providers)) {
    console.log(`  ${name}: checkout ${p.isConfigured() ? 'ready' : 'NOT configured'}, webhook ${p.webhookConfigured() ? 'ready' : 'NOT configured'}`);
  }
});
