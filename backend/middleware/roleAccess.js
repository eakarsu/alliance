// Role-based page/resource access configuration
// Based on Alliance CRM Rol Bazlı Kullanıcı El Kitabı - Sections 5-13
// Must stay in sync with frontend/src/config/rolePermissions.js

const rolePageAccess = {
  // Rol 1 – Founding Orchestrator / Core Governance (Fetih)
  // Full system access + all governance screens
  founding_orchestrator: [
    'dashboard', 'contacts', 'organizations', 'leads', 'opportunities',
    'products', 'projects', 'partners', 'agreements', 'activities',
    'risks', 'proposals', 'kpi', 'ai',
    'conflict-queue', 'visibility-approvals', 'compliance-reviews',
    'deal-paths', 'demo-queue', 'integration-map', 'governance'
  ],

  // Rol 5 – Delivery Manager / PMO (Muhittin)
  // Delivery focus: Projects(tam), Agreements(ilgili), Risks(özet), Conflict Queue(özet)
  pmo_coordinator: [
    'dashboard', 'contacts', 'organizations', 'leads', 'opportunities',
    'products', 'projects', 'partners', 'agreements', 'activities',
    'risks', 'proposals', 'kpi', 'ai',
    'conflict-queue', 'compliance-reviews', 'deal-paths',
    'resource-view', 'governance'
  ],

  // Rol 3 – Solution Architect / Technical Partner (Erol)
  // Technical focus: Products(tam), Integration Map, Demo Queue, Risks(özet)
  solution_architect: [
    'dashboard', 'contacts', 'organizations', 'leads', 'opportunities',
    'products', 'projects', 'partners', 'agreements', 'activities',
    'risks', 'proposals', 'kpi', 'ai',
    'conflict-queue', 'compliance-reviews',
    'deal-paths', 'demo-queue', 'integration-map', 'governance'
  ],

  // Rol 2 – Partner Owner / Business Builder (Gökhan, Yasin, İbrahim)
  // Own records focus: Leads, Opportunities, Products, Activities (all filtered)
  // Matrix: Conflict Queue(özet), Projects(ilgili), Agreements(ilgili)
  enterprise_partner: [
    'dashboard', 'contacts', 'organizations', 'leads', 'opportunities',
    'products', 'projects', 'partners', 'agreements', 'activities',
    'proposals', 'kpi', 'ai',
    'conflict-queue', 'deal-paths', 'demo-queue', 'integration-map'
  ],

  product_experience_lead: [
    'dashboard', 'contacts', 'organizations', 'leads', 'opportunities',
    'products', 'projects', 'partners', 'agreements', 'activities',
    'proposals', 'kpi', 'ai',
    'conflict-queue', 'deal-paths', 'demo-queue', 'integration-map'
  ],

  product_partner: [
    'dashboard', 'contacts', 'organizations', 'leads', 'opportunities',
    'products', 'projects', 'partners', 'agreements', 'activities',
    'proposals', 'kpi', 'ai',
    'conflict-queue', 'deal-paths', 'demo-queue', 'integration-map'
  ],

  // Rol 4 – Channel / Referral Partner (Michael)
  // Very limited: only referral workflow + limited products
  us_market_bridge: [
    'dashboard', 'referrals', 'status-tracker', 'payout-summary',
    'products', 'activities'
  ],

  // Rol 6 – Restricted External / Advisor (Archie)
  // Minimal: shared items, limited products, limited activities
  restricted_external: [
    'dashboard', 'shared-items', 'products', 'activities',
    'advisory-requests', 'meeting-notes', 'agreements'
  ],
};

function requireAccess(resource) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedPages = rolePageAccess[userRole];
    if (!allowedPages || !allowedPages.includes(resource)) {
      return res.status(403).json({ error: 'Access denied. Your role does not have permission for this resource.' });
    }

    next();
  };
}

module.exports = { requireAccess, rolePageAccess };
