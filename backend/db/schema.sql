-- Alliance CRM Database Schema
-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS visibility_requests CASCADE;
DROP TABLE IF EXISTS shared_items CASCADE;
DROP TABLE IF EXISTS opportunity_roles CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS kpi_contributions CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS agreements CASCADE;
DROP TABLE IF EXISTS compliance_reviews CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS project_milestones CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS opportunity_revenue_shares CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS opportunity_paths CASCADE;
DROP TABLE IF EXISTS deal_paths CASCADE;
DROP TABLE IF EXISTS opportunity_products CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS pipelines CASCADE;
DROP TABLE IF EXISTS lead_assignments CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS product_markets CASCADE;
DROP TABLE IF EXISTS product_capabilities CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_capabilities CASCADE;
DROP TABLE IF EXISTS capabilities CASCADE;
DROP TABLE IF EXISTS partner_entities CASCADE;
DROP TABLE IF EXISTS relationship_links CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  status VARCHAR(20) DEFAULT 'active',
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  role_scope VARCHAR(100),
  description TEXT
);

-- ============================================================
-- USER ROLE ASSIGNMENTS
-- ============================================================
CREATE TABLE user_role_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  org_name VARCHAR(255) NOT NULL,
  org_type VARCHAR(100),
  country VARCHAR(100),
  website VARCHAR(500),
  industry VARCHAR(100),
  employee_count INT,
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  visibility_level VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  title VARCHAR(150),
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  organization_id INT REFERENCES organizations(id) ON DELETE SET NULL,
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  trust_level VARCHAR(50),
  visibility_level VARCHAR(50),
  consent_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- RELATIONSHIP LINKS
-- ============================================================
CREATE TABLE relationship_links (
  id SERIAL PRIMARY KEY,
  contact_id INT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  known_by_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_strength VARCHAR(50),
  intro_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  sharing_permission BOOLEAN DEFAULT false,
  last_interaction_date DATE,
  notes TEXT
);

-- ============================================================
-- PARTNER ENTITIES
-- ============================================================
CREATE TABLE partner_entities (
  id SERIAL PRIMARY KEY,
  entity_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  billing_capability VARCHAR(100),
  active_status BOOLEAN DEFAULT true,
  geography VARCHAR(100),
  website VARCHAR(500),
  contact_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CAPABILITIES
-- ============================================================
CREATE TABLE capabilities (
  id SERIAL PRIMARY KEY,
  capability_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT
);

-- ============================================================
-- USER CAPABILITIES
-- ============================================================
CREATE TABLE user_capabilities (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability_id INT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(50),
  availability_level VARCHAR(50),
  notes TEXT
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  owner_entity_id INT REFERENCES partner_entities(id) ON DELETE SET NULL,
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  maturity_level VARCHAR(50),
  demo_available BOOLEAN DEFAULT false,
  recurring_model BOOLEAN DEFAULT false,
  white_label_possible BOOLEAN DEFAULT false,
  reseller_possible BOOLEAN DEFAULT false,
  implementation_required BOOLEAN DEFAULT false,
  compliance_risk_level VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PRODUCT CAPABILITIES
-- ============================================================
CREATE TABLE product_capabilities (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  capability_id INT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE
);

-- ============================================================
-- PRODUCT MARKETS
-- ============================================================
CREATE TABLE product_markets (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  geography VARCHAR(100),
  vertical VARCHAR(100),
  segment VARCHAR(100),
  active_flag BOOLEAN DEFAULT true
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  lead_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(100),
  source_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  sponsor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  organization_id INT REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
  geography VARCHAR(100),
  vertical VARCHAR(100),
  need_type VARCHAR(100),
  estimated_value DECIMAL(15,2),
  confidence_score INT,
  visibility_level VARCHAR(50),
  status VARCHAR(50) DEFAULT 'new',
  protected_until DATE,
  conflict_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LEAD ASSIGNMENTS
-- ============================================================
CREATE TABLE lead_assignments (
  id SERIAL PRIMARY KEY,
  lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_type VARCHAR(100),
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PIPELINES
-- ============================================================
CREATE TABLE pipelines (
  id SERIAL PRIMARY KEY,
  pipeline_name VARCHAR(255) NOT NULL,
  pipeline_type VARCHAR(100),
  active_flag BOOLEAN DEFAULT true
);

-- ============================================================
-- STAGES
-- ============================================================
CREATE TABLE stages (
  id SERIAL PRIMARY KEY,
  pipeline_id INT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_name VARCHAR(255) NOT NULL,
  stage_order INT NOT NULL,
  is_closed_won BOOLEAN DEFAULT false,
  is_closed_lost BOOLEAN DEFAULT false,
  probability_default INT
);

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
CREATE TABLE opportunities (
  id SERIAL PRIMARY KEY,
  opportunity_name VARCHAR(255) NOT NULL,
  lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
  account_org_id INT REFERENCES organizations(id) ON DELETE SET NULL,
  deal_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  source_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  sponsor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  pipeline_id INT REFERENCES pipelines(id) ON DELETE SET NULL,
  stage_id INT REFERENCES stages(id) ON DELETE SET NULL,
  deal_type VARCHAR(100),
  billing_entity_id INT REFERENCES partner_entities(id) ON DELETE SET NULL,
  estimated_total_value DECIMAL(15,2),
  recurring_value DECIMAL(15,2),
  one_time_value DECIMAL(15,2),
  expected_close_date DATE,
  visibility_level VARCHAR(50),
  compliance_review_status VARCHAR(50),
  win_probability INT,
  technical_partner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  product_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  delivery_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  conflict_flag BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- OPPORTUNITY PRODUCTS
-- ============================================================
CREATE TABLE opportunity_products (
  id SERIAL PRIMARY KEY,
  opportunity_id INT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  role_in_deal VARCHAR(100),
  primary_flag BOOLEAN DEFAULT false
);

-- ============================================================
-- DEAL PATHS
-- ============================================================
CREATE TABLE deal_paths (
  id SERIAL PRIMARY KEY,
  path_name VARCHAR(255) NOT NULL,
  description TEXT
);

-- ============================================================
-- OPPORTUNITY PATHS
-- ============================================================
CREATE TABLE opportunity_paths (
  id SERIAL PRIMARY KEY,
  opportunity_id INT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  deal_path_id INT NOT NULL REFERENCES deal_paths(id) ON DELETE CASCADE,
  primary_flag BOOLEAN DEFAULT false
);

-- ============================================================
-- PROPOSALS
-- ============================================================
CREATE TABLE proposals (
  id SERIAL PRIMARY KEY,
  opportunity_id INT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  proposal_number VARCHAR(100),
  proposal_date DATE,
  currency VARCHAR(10) DEFAULT 'USD',
  one_time_amount DECIMAL(15,2),
  recurring_amount DECIMAL(15,2),
  implementation_amount DECIMAL(15,2),
  support_amount DECIMAL(15,2),
  discount_amount DECIMAL(15,2),
  document_url VARCHAR(500),
  approval_status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- OPPORTUNITY REVENUE SHARES
-- ============================================================
CREATE TABLE opportunity_revenue_shares (
  id SERIAL PRIMARY KEY,
  opportunity_id INT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  beneficiary_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  beneficiary_entity_id INT REFERENCES partner_entities(id) ON DELETE SET NULL,
  share_type VARCHAR(100),
  share_percent DECIMAL(5,2),
  share_basis VARCHAR(100),
  calc_amount DECIMAL(15,2),
  payout_status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  notes TEXT
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  opportunity_id INT REFERENCES opportunities(id) ON DELETE SET NULL,
  project_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  delivery_manager_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  technical_lead_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE,
  target_end_date DATE,
  status VARCHAR(50) DEFAULT 'planning',
  scope_version VARCHAR(50),
  support_end_date DATE,
  budget DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PROJECT MILESTONES
-- ============================================================
CREATE TABLE project_milestones (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- RISKS
-- ============================================================
CREATE TABLE risks (
  id SERIAL PRIMARY KEY,
  related_type VARCHAR(100),
  related_id INT,
  risk_type VARCHAR(100),
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  mitigation_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- COMPLIANCE REVIEWS
-- ============================================================
CREATE TABLE compliance_reviews (
  id SERIAL PRIMARY KEY,
  related_type VARCHAR(100),
  related_id INT,
  personal_data_flag BOOLEAN DEFAULT false,
  recording_flag BOOLEAN DEFAULT false,
  eu_data_flag BOOLEAN DEFAULT false,
  dpa_required_flag BOOLEAN DEFAULT false,
  security_review_flag BOOLEAN DEFAULT false,
  ip_license_required_flag BOOLEAN DEFAULT false,
  reviewer_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  review_status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AGREEMENTS
-- ============================================================
CREATE TABLE agreements (
  id SERIAL PRIMARY KEY,
  agreement_type VARCHAR(100),
  related_type VARCHAR(100),
  related_id INT,
  party_1 VARCHAR(255),
  party_2 VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'draft',
  document_url VARCHAR(500),
  governing_law VARCHAR(100),
  renewal_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  related_type VARCHAR(100),
  related_id INT,
  activity_type VARCHAR(100),
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  activity_date TIMESTAMP,
  summary TEXT,
  next_step TEXT,
  private_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  related_type VARCHAR(100),
  related_id INT,
  author_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  note_type VARCHAR(50),
  visibility_level VARCHAR(50),
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- KPI CONTRIBUTIONS
-- ============================================================
CREATE TABLE kpi_contributions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contribution_type VARCHAR(100),
  related_type VARCHAR(100),
  related_id INT,
  metric_name VARCHAR(255),
  metric_value DECIMAL(15,2),
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id INT,
  changed_fields_json JSONB,
  old_value_json JSONB,
  new_value_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45)
);

-- ============================================================
-- OPPORTUNITY ROLES (two-level role system: per-opportunity)
-- ============================================================
CREATE TABLE opportunity_roles (
  id SERIAL PRIMARY KEY,
  opportunity_id INT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_opportunity VARCHAR(100) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(opportunity_id, user_id, role_in_opportunity)
);

-- ============================================================
-- SHARED ITEMS (for restricted external / advisor visibility)
-- ============================================================
CREATE TABLE shared_items (
  id SERIAL PRIMARY KEY,
  shared_with_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  access_level VARCHAR(50) DEFAULT 'view',
  shared_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- ============================================================
-- VISIBILITY REQUESTS (for governance approval queue)
-- ============================================================
CREATE TABLE visibility_requests (
  id SERIAL PRIMARY KEY,
  requested_by_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  current_visibility VARCHAR(50),
  requested_visibility VARCHAR(50),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_type VARCHAR(100),
  related_id INT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_opportunities_stage ON opportunities(stage_id);
CREATE INDEX idx_opportunities_pipeline ON opportunities(pipeline_id);
CREATE INDEX idx_opportunities_owner ON opportunities(deal_owner_user_id);
CREATE INDEX idx_projects_owner ON projects(project_owner_user_id);
CREATE INDEX idx_activities_related ON activities(related_type, related_id);
CREATE INDEX idx_notes_related ON notes(related_type, related_id);
CREATE INDEX idx_risks_related ON risks(related_type, related_id);
CREATE INDEX idx_agreements_related ON agreements(related_type, related_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_kpi_user ON kpi_contributions(user_id);
CREATE INDEX idx_opportunity_roles_opp ON opportunity_roles(opportunity_id);
CREATE INDEX idx_opportunity_roles_user ON opportunity_roles(user_id);
CREATE INDEX idx_shared_items_user ON shared_items(shared_with_user_id);
CREATE INDEX idx_shared_items_entity ON shared_items(entity_type, entity_id);
CREATE INDEX idx_visibility_requests_status ON visibility_requests(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
