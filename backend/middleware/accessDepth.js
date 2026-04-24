// Access depth matrix matching Section 13 of the document
// tam=full, ozet=summary, sinirli=limited, paylasilan=shared only, ilgili=related, yok=none
const accessDepthMap = {
  founding_orchestrator: { dashboard: 'tam', contacts: 'tam', organizations: 'tam', leads: 'tam', opportunities: 'tam', products: 'tam', projects: 'ozet', partners: 'tam', agreements: 'tam', activities: 'tam', risks: 'tam', governance: 'tam' },
  pmo_coordinator: { dashboard: 'tam', contacts: 'tam', organizations: 'tam', leads: 'tam', opportunities: 'ilgili', products: 'ilgili', projects: 'tam', partners: 'tam', agreements: 'ilgili', activities: 'tam', risks: 'ozet', governance: 'ozet' },
  solution_architect: { dashboard: 'tam', contacts: 'tam', organizations: 'tam', leads: 'tam', opportunities: 'ilgili', products: 'tam', projects: 'ilgili', partners: 'tam', agreements: 'ilgili', activities: 'tam', risks: 'ozet', governance: 'ozet' },
  enterprise_partner: { dashboard: 'tam', contacts: 'ilgili', organizations: 'ilgili', leads: 'ilgili', opportunities: 'ilgili', products: 'ilgili', partners: 'ilgili', activities: 'ilgili', risks: 'yok' },
  product_experience_lead: { dashboard: 'tam', contacts: 'ilgili', organizations: 'ilgili', leads: 'ilgili', opportunities: 'ilgili', products: 'ilgili', partners: 'ilgili', activities: 'ilgili', risks: 'yok' },
  product_partner: { dashboard: 'tam', contacts: 'ilgili', organizations: 'ilgili', leads: 'ilgili', opportunities: 'ilgili', products: 'ilgili', partners: 'ilgili', activities: 'ilgili', risks: 'yok' },
  us_market_bridge: { dashboard: 'tam', contacts: 'ilgili', organizations: 'ilgili', leads: 'ilgili', opportunities: 'ilgili', products: 'ilgili', partners: 'ilgili', activities: 'ilgili', risks: 'yok' },
  restricted_external: { dashboard: 'sinirli', activities: 'paylasilan', products: 'paylasilan' },
};

// Fields to strip for summary (ozet) access
const SUMMARY_STRIP_FIELDS = ['notes', 'compliance_review_status', 'win_probability', 'document_url', 'linkedin_url', 'consent_status'];
// Fields to keep for limited (sinirli) access
const LIMITED_FIELDS = ['id', 'name', 'title', 'status', 'created_at', 'stage_name', 'org_name', 'account_name'];

function getDepth(role, resource) {
  return accessDepthMap[role]?.[resource] || 'yok';
}

function filterByDepth(role, resource, data) {
  const depth = getDepth(role, resource);
  if (depth === 'tam' || depth === 'ilgili') return data; // row filtering already handled

  const filterRow = (row) => {
    if (depth === 'ozet') {
      const filtered = { ...row };
      SUMMARY_STRIP_FIELDS.forEach(f => delete filtered[f]);
      return filtered;
    }
    if (depth === 'sinirli' || depth === 'paylasilan') {
      const filtered = {};
      Object.keys(row).forEach(k => {
        // Keep basic identifying fields
        if (LIMITED_FIELDS.some(lf => k.includes(lf)) || k === 'id' || k.endsWith('_name') || k === 'status' || k === 'created_at' || k === 'entity_type') {
          filtered[k] = row[k];
        }
      });
      return filtered;
    }
    return row;
  };

  if (Array.isArray(data)) return data.map(filterRow);
  return filterRow(data);
}

module.exports = { getDepth, filterByDepth, accessDepthMap };
