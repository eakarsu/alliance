// Data-level filtering based on user role
// Implements the document's access depth: Tam/Özet/Sınırlı/Paylaşılan/İlgili

const FULL_ACCESS_ROLES = ['founding_orchestrator'];
const PARTNER_ROLES = ['enterprise_partner', 'product_experience_lead', 'product_partner', 'us_market_bridge'];
const RESTRICTED_ROLES = ['restricted_external'];

function isFullAccess(role) {
  return FULL_ACCESS_ROLES.includes(role);
}

function isPartnerRole(role) {
  return PARTNER_ROLES.includes(role);
}

function isRestricted(role) {
  return RESTRICTED_ROLES.includes(role);
}

// Returns { clause, params } to add to WHERE for owner-based filtering
// paramStart is the next $N parameter number
function ownerFilter(role, userId, ownerColumn, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  // PMO and solution_architect: full access to contacts/orgs (tam)
  if (role === 'pmo_coordinator' || role === 'solution_architect') {
    return { clause: '', params: [], nextParam: paramStart };
  }
  // Partner + restricted: filter by owner
  return {
    clause: ` AND ${ownerColumn} = $${paramStart}`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// For opportunities: partner sees own deals (deal_owner, source_owner, or sponsor)
// PMO sees delivery-related (has linked project where they're delivery_manager, or opportunity_roles)
// Solution architect sees opportunities where they have an opportunity_role (gorevli = assigned)
function opportunityFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (role === 'pmo_coordinator') {
    // PMO sees opportunities where they have a direct role, linked projects, or opportunity_roles
    return {
      clause: ` AND (op.deal_owner_user_id = $${paramStart} OR op.source_owner_user_id = $${paramStart} OR op.sponsor_user_id = $${paramStart} OR op.technical_partner_user_id = $${paramStart} OR op.product_owner_user_id = $${paramStart} OR op.delivery_owner_user_id = $${paramStart} OR op.id IN (SELECT opportunity_id FROM projects WHERE delivery_manager_user_id = $${paramStart}) OR op.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart}))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  if (role === 'solution_architect') {
    // Solution architect sees opportunities where they have a direct role or an opportunity_role
    return {
      clause: ` AND (op.deal_owner_user_id = $${paramStart} OR op.source_owner_user_id = $${paramStart} OR op.sponsor_user_id = $${paramStart} OR op.technical_partner_user_id = $${paramStart} OR op.product_owner_user_id = $${paramStart} OR op.delivery_owner_user_id = $${paramStart} OR op.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart}))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  // Partner roles: own deals + assigned roles
  return {
    clause: ` AND (op.deal_owner_user_id = $${paramStart} OR op.source_owner_user_id = $${paramStart} OR op.sponsor_user_id = $${paramStart} OR op.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart}))`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// For leads: pmo_coordinator and solution_architect see all leads (tam access)
// Partner sees own leads (source_owner or assigned)
function leadFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  // PMO and solution_architect have tam access to contacts/leads
  if (role === 'pmo_coordinator' || role === 'solution_architect') {
    return { clause: '', params: [], nextParam: paramStart };
  }
  return {
    clause: ` AND (l.source_owner_user_id = $${paramStart} OR l.sponsor_user_id = $${paramStart} OR l.id IN (SELECT lead_id FROM lead_assignments WHERE assigned_user_id = $${paramStart}))`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// For projects: PMO gets full access (tam), solution_architect sees related (ilgili)
function projectFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (role === 'pmo_coordinator') {
    // PMO has tam (full) access to projects
    return { clause: '', params: [], nextParam: paramStart };
  }
  // Solution architect and partner roles: see related projects
  return {
    clause: ` AND (pj.project_owner_user_id = $${paramStart} OR pj.delivery_manager_user_id = $${paramStart} OR pj.technical_lead_user_id = $${paramStart})`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// For activities: partner sees own + non-private; restricted sees only shared-related
function activityFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (role === 'pmo_coordinator' || role === 'solution_architect') {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (isRestricted(role)) {
    // Restricted users: only activities they own or related to shared items
    return {
      clause: ` AND (a.owner_user_id = $${paramStart} OR (a.related_type = 'product' AND a.related_id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${paramStart} AND entity_type = 'product')) OR (a.related_type = 'agreement' AND a.related_id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${paramStart} AND entity_type = 'agreement')))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  return {
    clause: ` AND (a.owner_user_id = $${paramStart} OR a.private_flag = false)`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// For organizations: founding_orchestrator sees all. pmo/solution_architect sees all (tam). Partners see own (owner_user_id). Restricted: none.
function organizationFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (role === 'pmo_coordinator' || role === 'solution_architect') {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (isPartnerRole(role)) {
    return {
      clause: ` AND o.owner_user_id = $${paramStart}`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  // Restricted: no access (should be blocked at page level, but return nothing if reached)
  return {
    clause: ` AND 1=0`,
    params: [],
    nextParam: paramStart
  };
}

// For agreements: founding_orchestrator/pmo_coordinator sees all. solution_architect sees related (opportunity's technical_partner).
// Partners see related (linked to their opportunities). Restricted sees shared only.
function agreementFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (role === 'pmo_coordinator') {
    return {
      clause: ` AND (a.related_type = 'opportunity' AND a.related_id IN (SELECT id FROM opportunities WHERE deal_owner_user_id = $${paramStart} OR source_owner_user_id = $${paramStart} OR sponsor_user_id = $${paramStart} OR technical_partner_user_id = $${paramStart} OR product_owner_user_id = $${paramStart} OR delivery_owner_user_id = $${paramStart} OR id IN (SELECT opportunity_id FROM projects WHERE delivery_manager_user_id = $${paramStart}) OR id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart})) OR a.related_type != 'opportunity')`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  if (role === 'solution_architect') {
    return {
      clause: ` AND (a.related_type = 'opportunity' AND a.related_id IN (SELECT id FROM opportunities WHERE deal_owner_user_id = $${paramStart} OR source_owner_user_id = $${paramStart} OR sponsor_user_id = $${paramStart} OR technical_partner_user_id = $${paramStart} OR product_owner_user_id = $${paramStart} OR delivery_owner_user_id = $${paramStart} OR id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart})) OR a.related_type != 'opportunity')`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  if (isPartnerRole(role)) {
    return {
      clause: ` AND (a.related_type = 'opportunity' AND a.related_id IN (SELECT id FROM opportunities WHERE deal_owner_user_id = $${paramStart} OR source_owner_user_id = $${paramStart} OR sponsor_user_id = $${paramStart} OR id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart})) OR a.related_type != 'opportunity')`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  if (isRestricted(role)) {
    return {
      clause: ` AND a.id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${paramStart} AND entity_type = 'agreement')`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  return { clause: ' AND 1=0', params: [], nextParam: paramStart };
}

// For products: founding_orchestrator/solution_architect sees all. pmo_coordinator sees related.
// Partners see own + shared. us_market_bridge sees all. Restricted sees shared only.
function productFilter(role, userId, paramStart) {
  if (isFullAccess(role) || role === 'solution_architect') {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (role === 'us_market_bridge') {
    // Ozet access: only products with status='active' (summary view, no inactive/draft products)
    return {
      clause: ` AND p.status = 'active'`,
      params: [],
      nextParam: paramStart
    };
  }
  if (role === 'pmo_coordinator') {
    return {
      clause: ` AND (p.id IN (SELECT product_id FROM opportunity_products WHERE opportunity_id IN (SELECT opportunity_id FROM projects WHERE delivery_manager_user_id = $${paramStart})) OR p.id IN (SELECT product_id FROM opportunity_products WHERE opportunity_id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart})))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  if (isPartnerRole(role)) {
    return {
      clause: ` AND (p.owner_user_id = $${paramStart} OR p.id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${paramStart} AND entity_type = 'product'))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  if (isRestricted(role)) {
    return {
      clause: ` AND p.id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${paramStart} AND entity_type = 'product')`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  return { clause: ' AND 1=0', params: [], nextParam: paramStart };
}

// For proposals: same as opportunity filter (proposals link to opportunities)
function proposalFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  // pmo_coordinator, solution_architect, partner roles: direct roles + opportunity_roles
  const directClause = ` AND (o.deal_owner_user_id = $${paramStart} OR o.source_owner_user_id = $${paramStart} OR o.sponsor_user_id = $${paramStart} OR o.technical_partner_user_id = $${paramStart} OR o.product_owner_user_id = $${paramStart} OR o.delivery_owner_user_id = $${paramStart} OR o.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${paramStart})`;
  if (role === 'pmo_coordinator') {
    return {
      clause: directClause + ` OR o.id IN (SELECT opportunity_id FROM projects WHERE delivery_manager_user_id = $${paramStart}))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  return {
    clause: directClause + `)`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// For risks: founding_orchestrator sees all. pmo_coordinator sees project-related risks.
// solution_architect sees technical risks + related. Partners see risks on their entities.
function riskFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  if (role === 'pmo_coordinator') {
    return {
      clause: ` AND (r.related_type = 'project' OR r.owner_user_id = $${paramStart} OR r.related_id IN (SELECT id FROM projects WHERE delivery_manager_user_id = $${paramStart}))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  if (role === 'solution_architect') {
    return {
      clause: ` AND (r.risk_type = 'technical' OR r.owner_user_id = $${paramStart} OR (r.related_type = 'project' AND r.related_id IN (SELECT id FROM projects WHERE technical_lead_user_id = $${paramStart})))`,
      params: [userId],
      nextParam: paramStart + 1
    };
  }
  // Partner roles: risks on their entities
  return {
    clause: ` AND r.owner_user_id = $${paramStart}`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// For KPI: founding_orchestrator sees all. Others see own KPI contributions.
function kpiFilter(role, userId, paramStart) {
  if (isFullAccess(role)) {
    return { clause: '', params: [], nextParam: paramStart };
  }
  return {
    clause: ` AND k.user_id = $${paramStart}`,
    params: [userId],
    nextParam: paramStart + 1
  };
}

// Quick detail access check - runs a filtered count query to verify user can access a specific record
async function canAccessRecord(pool, table, alias, filterFn, recordId, role, userId) {
  if (isFullAccess(role)) return true;
  const filter = filterFn(role, userId, 1);
  if (!filter.clause) return true; // no filter = full access for this role
  const result = await pool.query(
    `SELECT COUNT(*) FROM ${table} ${alias} WHERE ${alias}.id = $${filter.params.length + 1}${filter.clause}`,
    [...filter.params, recordId]
  );
  return parseInt(result.rows[0].count) > 0;
}

// Contact access check (uses ownerFilter which has different signature)
async function canAccessContact(pool, recordId, role, userId) {
  if (isFullAccess(role)) return true;
  if (role === 'pmo_coordinator' || role === 'solution_architect') return true;
  if (isRestricted(role)) return false;
  // Partner: must be owner or in relationship_links
  const result = await pool.query(
    `SELECT COUNT(*) FROM contacts c WHERE c.id = $1 AND (c.owner_user_id = $2 OR c.id IN (SELECT contact_id FROM relationship_links WHERE known_by_user_id = $2))`,
    [recordId, userId]
  );
  return parseInt(result.rows[0].count) > 0;
}

// Organization access check
async function canAccessOrganization(pool, recordId, role, userId) {
  if (isFullAccess(role)) return true;
  if (role === 'pmo_coordinator' || role === 'solution_architect') return true;
  if (isRestricted(role)) return false;
  if (isPartnerRole(role)) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM organizations o WHERE o.id = $1 AND o.owner_user_id = $2`,
      [recordId, userId]
    );
    return parseInt(result.rows[0].count) > 0;
  }
  return false;
}

module.exports = {
  isFullAccess, isPartnerRole, isRestricted,
  ownerFilter, opportunityFilter, leadFilter, projectFilter, activityFilter,
  organizationFilter, agreementFilter, productFilter, proposalFilter, riskFilter, kpiFilter,
  canAccessRecord, canAccessContact, canAccessOrganization,
  FULL_ACCESS_ROLES, PARTNER_ROLES, RESTRICTED_ROLES
};
