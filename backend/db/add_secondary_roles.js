const pool = require('./connection');
async function run() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_roles TEXT[];
  `);
  // Seed the secondary roles from the document
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['strategy', 'opportunity_architect', 'relationship_owner'] WHERE role = 'founding_orchestrator'`);
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['partner_development', 'investor_relations'] WHERE role = 'pmo_coordinator'`);
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['integration_lead', 'crm_technical_owner'] WHERE role = 'solution_architect'`);
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['channel_bridge', 'whitelabel_enabler'] WHERE role = 'enterprise_partner' AND id = 4`);
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['chatbot_owner', 'site_conversion'] WHERE role = 'product_experience_lead'`);
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['regional_licensing', 'vertical_licensing'] WHERE role = 'product_partner'`);
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['consulting_delivery', 'opportunity_partner'] WHERE role = 'us_market_bridge'`);
  await pool.query(`UPDATE users SET secondary_roles = ARRAY['referral_contact', 'project_specific'] WHERE role = 'restricted_external'`);
  console.log('Secondary roles added');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
