'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const pool = require('./db/connection');

const app = express();
const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health/ready', async (_req, res) => {
  try { await pool.query('SELECT 1 FROM alliance_cases LIMIT 1'); res.json({ status: 'ready', authoritativeSurface: '/api/v1/alliance' }); }
  catch (_error) { res.status(503).json({ status: 'not_ready' }); }
});
app.use('/api/auth', require('./routes/allianceAuth'));
app.use('/api/v1/alliance', require('./routes/authoritativeAlliance'));

// Legacy demo CRUD, generic-model, custom-view, integration, and generated gap
// routes were not tenant-safe or authoritative. They remain as source material
// but are not a supported runtime fallback.
app.use('/api', (_req, res) => res.status(410).json({ error: 'Legacy/generated route retired; use /api/v1/alliance' }));

app.use((error, _req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' });
});

if (require.main === module) {
  const port = Number(process.env.BACKEND_PORT || process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('BACKEND_PORT or PORT is required');
  app.listen(port, '127.0.0.1', () => console.log(`Alliance governed API listening on http://127.0.0.1:${port}`));
}

module.exports = app;
