const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const { requireAccess } = require('./middleware/roleAccess');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors({
  origin: [`http://localhost:${process.env.FRONTEND_PORT || 3000}`],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no role check needed)
app.use('/api/auth', require('./routes/auth'));

// Protected routes with role-based access
app.use('/api/dashboard', auth, requireAccess('dashboard'), require('./routes/dashboard'));
app.use('/api/contacts', auth, requireAccess('contacts'), require('./routes/contacts'));
app.use('/api/organizations', auth, requireAccess('organizations'), require('./routes/organizations'));
app.use('/api/leads', auth, requireAccess('leads'), require('./routes/leads'));
app.use('/api/opportunities', auth, requireAccess('opportunities'), require('./routes/opportunities'));
app.use('/api/products', auth, requireAccess('products'), require('./routes/products'));
app.use('/api/projects', auth, requireAccess('projects'), require('./routes/projects'));
app.use('/api/partners', auth, requireAccess('partners'), require('./routes/partners'));
app.use('/api/agreements', auth, requireAccess('agreements'), require('./routes/agreements'));
app.use('/api/activities', auth, requireAccess('activities'), require('./routes/activities'));
app.use('/api/risks', auth, requireAccess('risks'), require('./routes/risks'));
app.use('/api/proposals', auth, requireAccess('proposals'), require('./routes/proposals'));
app.use('/api/kpi', auth, requireAccess('kpi'), require('./routes/kpi'));
app.use('/api/ai', auth, requireAccess('ai'), require('./routes/ai'));

// Governance routes - handles its own sub-route access checks internally
// (conflict-queue, visibility-approvals, overview each check their own permissions)
app.use('/api/governance', auth, require('./routes/governance'));

// Referral & Revenue routes
app.use('/api/referrals', auth, requireAccess('referrals'), require('./routes/referrals'));

// Shared items
app.use('/api/shared-items', auth, requireAccess('shared-items'), require('./routes/sharedItems'));

// Ecosystem routes
app.use('/api/deal-paths', auth, requireAccess('deal-paths'), require('./routes/dealPaths'));
app.use('/api/compliance-reviews', auth, requireAccess('compliance-reviews'), require('./routes/complianceReviews'));

// Notifications (auth only, route handles its own auth internally)
app.use('/api/notifications', require('./routes/notifications'));

// Opportunity roles (internal, auth only)
app.use('/api/opportunity-roles', auth, require('./routes/opportunityRoles'));

// Documents
app.use('/api/documents', auth, require('./routes/documents'));

// Integrations + advanced AI (apply pass 5)
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/custom', auth, require('./routes/customFeatures'));

// User list for pickers (auth only, returns minimal user info)
app.get('/api/users/list', auth, async (req, res) => {
  try {
    const pool = require('./db/connection');
    const result = await pool.query('SELECT id, full_name, first_name, last_name, role FROM users ORDER BY full_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Custom Views (Alliance Views) ===
app.use('/api/custom-views', require('./routes/customViews'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// // === Batch 09 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-alliance', require('./routes/batch09GapAi')); // // === Batch 09 Gaps & Frontend Mounts ===
app.use('/api/gap-nonai-alliance', require('./routes/batch09GapNonai')); // // === Batch 09 Gaps & Frontend Mounts ===

app.listen(PORT, () => {
  console.log(`Alliance CRM Backend running on port ${PORT}`);
});

module.exports = app;


