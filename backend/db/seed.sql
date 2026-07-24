-- Alliance CRM Seed Data
-- Login passwords are provisioned from the ignored local environment after this seed runs.
-- ============================================================
-- USERS (Real alliance team)
-- ============================================================
INSERT INTO users (full_name, email, password_hash, role, timezone, status) VALUES
('Fetih', 'fetih@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'founding_orchestrator', 'Europe/Istanbul', 'active'),
('Muhittin', 'muhittin@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'pmo_coordinator', 'Europe/Istanbul', 'active'),
('Erol', 'erol@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'solution_architect', 'Europe/Istanbul', 'active'),
('Gökhan', 'gokhan@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'enterprise_partner', 'Europe/Istanbul', 'active'),
('Yasin', 'yasin@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'product_experience_lead', 'Europe/Istanbul', 'active'),
('İbrahim', 'ibrahim@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'product_partner', 'Europe/Istanbul', 'active'),
('Michael', 'michael@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'us_market_bridge', 'US/Eastern', 'active'),
('Archie', 'archie@alliance.com', 'DISABLED_UNTIL_LOCAL_PROVISIONING', 'restricted_external', 'US/Eastern', 'active');

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (role_name, role_scope, description) VALUES
('founding_orchestrator', 'global', 'Core governance. Strategy, opportunity architecture, relationship ownership. Full system visibility.'),
('pmo_coordinator', 'global', 'PMO / Alliance coordination. Partner development, investor/channel relations. Delivery discipline.'),
('solution_architect', 'technical', 'Chief Solution Architect. Integration lead, CRM technical owner. Technical feasibility and delivery backbone.'),
('enterprise_partner', 'partner', 'Enterprise Solution Partner. Channel bridge, white-label/reseller enabler.'),
('product_experience_lead', 'partner', 'Product Experience Lead. Chatbot/site conversion owner. Demo quality, UI/UX.'),
('product_partner', 'partner', 'Flagship Product Partner. Regional/vertical licensing.'),
('us_market_bridge', 'partner', 'US Market Bridge. Consulting delivery, opportunity partner.'),
('restricted_external', 'limited', 'Restricted External Contact. Referral/project-specific contact only.');

-- ============================================================
-- USER ROLE ASSIGNMENTS
-- ============================================================
INSERT INTO user_role_assignments (user_id, role_id, start_date) VALUES
(1, 1, '2024-01-01'),
(2, 2, '2024-01-01'),
(3, 3, '2024-01-01'),
(4, 4, '2024-02-01'),
(5, 5, '2024-02-01'),
(6, 6, '2024-02-01'),
(7, 7, '2024-03-01'),
(8, 8, '2024-04-01');

-- ============================================================
-- ORGANIZATIONS (15+)
-- ============================================================
INSERT INTO organizations (org_name, org_type, country, website, industry, employee_count, owner_user_id, visibility_level, notes) VALUES
('TechVista Solutions', 'client', 'Turkey', 'https://techvista.com.tr', 'Technology', 250, 3, 'active', 'Enterprise software client in Istanbul'),
('Nordic Digital Labs', 'client', 'Sweden', 'https://nordicdigital.se', 'Technology', 120, 1, 'active', 'Scandinavian digital transformation firm'),
('Berlin Cloud GmbH', 'partner', 'Germany', 'https://berlincloud.de', 'Cloud Services', 80, 3, 'active', 'Cloud infrastructure partner'),
('Aegean Consulting', 'client', 'Greece', 'https://aegeanconsulting.gr', 'Consulting', 45, 2, 'active', 'Management consulting firm'),
('Dubai Innovation Hub', 'prospect', 'UAE', 'https://dubaiinnovation.ae', 'Innovation', 300, 1, 'active', 'Innovation and startup accelerator'),
('London FinTech Partners', 'client', 'UK', 'https://londonfintech.co.uk', 'Financial Services', 150, 4, 'active', 'FinTech advisory and solutions'),
('Sofia Data Systems', 'partner', 'Bulgaria', 'https://sofiadatasys.bg', 'Data Analytics', 60, 3, 'active', 'Data analytics and BI partner'),
('Amsterdam AI Group', 'prospect', 'Netherlands', 'https://amsterdamai.nl', 'Artificial Intelligence', 95, 1, 'active', 'AI and ML consulting firm'),
('Ankara Gov Solutions', 'client', 'Turkey', 'https://ankaraigov.com.tr', 'Government', 500, 1, 'active', 'Government digital transformation'),
('Paris Luxe Digital', 'client', 'France', 'https://parisluxe.fr', 'Retail', 200, 2, 'active', 'Luxury retail digital platform'),
('Zurich SecureNet', 'partner', 'Switzerland', 'https://zurichsecure.ch', 'Cybersecurity', 75, 3, 'active', 'Cybersecurity solutions provider'),
('Warsaw DataHub', 'prospect', 'Poland', 'https://warsawdata.pl', 'Data Services', 40, 4, 'active', 'Data management and integration'),
('Milan Smart Factory', 'client', 'Italy', 'https://milansmartfactory.it', 'Manufacturing', 180, 2, 'active', 'Smart manufacturing solutions'),
('Vienna HealthTech', 'prospect', 'Austria', 'https://viennahealth.at', 'Healthcare', 110, 5, 'active', 'Healthcare technology startup'),
('Lisbon Green Energy', 'client', 'Portugal', 'https://lisbongreen.pt', 'Energy', 90, 1, 'active', 'Green energy management platform'),
('Barcelona EduTech', 'prospect', 'Spain', 'https://barcelonaedu.es', 'Education', 65, 4, 'active', 'Educational technology solutions');

-- ============================================================
-- CONTACTS (15+)
-- ============================================================
INSERT INTO contacts (first_name, last_name, title, email, phone, linkedin_url, organization_id, owner_user_id, trust_level, visibility_level, consent_status, notes) VALUES
('Cem', 'Yildirim', 'CTO', 'cem@techvista.com.tr', '+90-532-111-2233', 'https://linkedin.com/in/cemyildirim', 1, 3, 'high', 'team', 'granted', 'Key technical decision maker'),
('Anna', 'Lindqvist', 'CEO', 'anna@nordicdigital.se', '+46-70-123-4567', 'https://linkedin.com/in/annalindqvist', 2, 1, 'high', 'team', 'granted', 'Strategic partnership contact'),
('Klaus', 'Weber', 'VP Engineering', 'klaus@berlincloud.de', '+49-170-987-6543', 'https://linkedin.com/in/klausweber', 3, 3, 'medium', 'team', 'granted', 'Technical partnership lead'),
('Nikos', 'Papadopoulos', 'Managing Partner', 'nikos@aegeanconsulting.gr', '+30-694-555-1234', 'https://linkedin.com/in/nikospapa', 4, 2, 'high', 'team', 'granted', 'Long-term consulting relationship'),
('Fatima', 'Al-Rashid', 'Innovation Director', 'fatima@dubaiinnovation.ae', '+971-50-123-4567', 'https://linkedin.com/in/fatimaalrashid', 5, 1, 'medium', 'restricted', 'pending', 'New contact from Dubai expo'),
('James', 'Crawford', 'Head of Partnerships', 'james@londonfintech.co.uk', '+44-7700-900-123', 'https://linkedin.com/in/jamescrawford', 6, 4, 'high', 'team', 'granted', 'FinTech partnership champion'),
('Ivana', 'Petrova', 'Data Science Lead', 'ivana@sofiadatasys.bg', '+359-88-765-4321', 'https://linkedin.com/in/ivanapetrova', 7, 3, 'medium', 'team', 'granted', 'Technical data analytics contact'),
('Pieter', 'Van der Berg', 'Founder', 'pieter@amsterdamai.nl', '+31-6-1234-5678', 'https://linkedin.com/in/pietervdb', 8, 1, 'low', 'private', 'pending', 'Initial introduction at conference'),
('Derya', 'Koc', 'Digital Director', 'derya@ankaraigov.com.tr', '+90-533-444-5566', 'https://linkedin.com/in/deryakoc', 9, 1, 'high', 'team', 'granted', 'Government project sponsor'),
('Marie', 'Dubois', 'CDO', 'marie@parisluxe.fr', '+33-6-1234-5678', 'https://linkedin.com/in/mariedubois', 10, 2, 'medium', 'team', 'granted', 'Digital transformation leader'),
('Stefan', 'Mueller', 'CISO', 'stefan@zurichsecure.ch', '+41-79-123-4567', 'https://linkedin.com/in/stefanmueller', 11, 3, 'high', 'team', 'granted', 'Security partnership lead'),
('Katarzyna', 'Nowak', 'CTO', 'katarzyna@warsawdata.pl', '+48-501-234-567', 'https://linkedin.com/in/katarzynanowak', 12, 4, 'low', 'team', 'pending', 'Prospect contact from webinar'),
('Marco', 'Rossi', 'Plant Director', 'marco@milansmartfactory.it', '+39-333-123-4567', 'https://linkedin.com/in/marcorossi', 13, 2, 'medium', 'team', 'granted', 'Manufacturing digital twin sponsor'),
('Lisa', 'Huber', 'COO', 'lisa@viennahealth.at', '+43-660-123-4567', 'https://linkedin.com/in/lisahuber', 14, 5, 'low', 'team', 'pending', 'HealthTech exploration contact'),
('Pedro', 'Santos', 'Sustainability Director', 'pedro@lisbongreen.pt', '+351-91-234-5678', 'https://linkedin.com/in/pedrosantos', 15, 1, 'medium', 'team', 'granted', 'Green energy project champion'),
('Carlos', 'Garcia', 'EdTech Director', 'carlos@barcelonaedu.es', '+34-612-345-678', 'https://linkedin.com/in/carlosgarcia', 16, 4, 'low', 'restricted', 'pending', 'Initial exploratory call done');

-- ============================================================
-- RELATIONSHIP LINKS (15+)
-- ============================================================
INSERT INTO relationship_links (contact_id, known_by_user_id, relationship_strength, intro_owner_user_id, sharing_permission, last_interaction_date, notes) VALUES
(1, 3, 'strong', 3, true, '2025-12-15', 'Erol - known for 5+ years, regular collaboration'),
(2, 1, 'strong', 1, true, '2025-11-20', 'Fetih - met at Nordic Tech Summit 2023'),
(3, 3, 'medium', 3, true, '2025-10-10', 'Erol - introduced at cloud conference'),
(4, 2, 'strong', 2, true, '2025-12-01', 'Muhittin - long-standing consulting relationship'),
(5, 1, 'weak', 1, false, '2025-09-15', 'Fetih - brief meeting at Dubai Expo'),
(6, 4, 'strong', 4, true, '2025-12-10', 'Gökhan - primary relationship owner'),
(7, 3, 'medium', 3, true, '2025-11-05', 'Erol - technical collaboration ongoing'),
(8, 1, 'weak', 1, false, '2025-08-20', 'Fetih - conference introduction only'),
(9, 1, 'strong', 1, true, '2025-12-20', 'Fetih - government contract key contact'),
(10, 2, 'medium', 2, true, '2025-11-15', 'Muhittin - introduced through industry network'),
(11, 3, 'strong', 3, true, '2025-12-05', 'Erol - security partnership deep relationship'),
(12, 4, 'weak', 4, false, '2025-10-25', 'Gökhan - webinar lead, needs nurturing'),
(13, 2, 'medium', 2, true, '2025-11-30', 'Muhittin - manages delivery relationship'),
(14, 5, 'weak', 5, false, '2025-09-10', 'Yasin - exploring healthtech vertical'),
(15, 1, 'medium', 1, true, '2025-12-18', 'Fetih - active green energy project'),
(1, 3, 'medium', 3, true, '2025-11-01', 'Erol also works with TechVista');

-- ============================================================
-- PARTNER ENTITIES
-- ============================================================
INSERT INTO partner_entities (entity_name, entity_type, billing_capability, active_status, geography, website, contact_email, notes) VALUES
('Alliance Core', 'core', 'full', true, 'Global', 'https://alliance-core.com', 'info@alliance-core.com', 'Core alliance entity'),
('Gökhan Consulting', 'channel_partner', 'reseller', true, 'Turkey/Europe', NULL, 'gokhan@alliance.com', 'Enterprise solution channel'),
('Yasin Digital', 'product_partner', 'product', true, 'Turkey', NULL, 'yasin@alliance.com', 'Product experience and chatbot'),
('İbrahim Products', 'product_partner', 'licensing', true, 'Regional', NULL, 'ibrahim@alliance.com', 'Flagship product licensing'),
('Michael Consulting US', 'consulting_partner', 'consulting', true, 'US', NULL, 'michael@alliance.com', 'US market consulting delivery');

-- ============================================================
-- CAPABILITIES
-- ============================================================
INSERT INTO capabilities (capability_name, category, description) VALUES
('CRM Integration', 'technical', 'CRM system integration and customization'),
('AI/ML Solutions', 'technical', 'Artificial intelligence and machine learning implementation'),
('Cloud Architecture', 'technical', 'Cloud infrastructure design and migration'),
('Digital Transformation', 'consulting', 'End-to-end digital transformation advisory'),
('Cybersecurity', 'technical', 'Security assessment and implementation'),
('Data Analytics', 'technical', 'Data pipeline and analytics solutions'),
('UI/UX Design', 'product', 'User interface and experience design'),
('Chatbot Development', 'product', 'Conversational AI and chatbot solutions'),
('Government Solutions', 'vertical', 'Public sector digital solutions'),
('FinTech Solutions', 'vertical', 'Financial technology implementations');

-- ============================================================
-- PRODUCTS
-- ============================================================
INSERT INTO products (product_name, category, owner_entity_id, owner_user_id, maturity_level, demo_available, recurring_model, white_label_possible, reseller_possible, implementation_required, compliance_risk_level, status, notes) VALUES
('Alliance CRM', 'platform', 1, 3, 'mvp', true, true, false, false, true, 'low', 'active', 'Core CRM platform for alliance management'),
('SmartChat Pro', 'product', 3, 5, 'growth', true, true, true, true, false, 'low', 'active', 'AI chatbot for website conversion'),
('Enterprise Bridge', 'service', 2, 4, 'mature', false, false, true, true, true, 'medium', 'active', 'White-label enterprise solution bridge'),
('DataSync Platform', 'platform', 1, 3, 'mvp', true, true, false, false, true, 'medium', 'active', 'Data integration and sync platform'),
('RegionalLicense Suite', 'product', 4, 6, 'growth', true, true, false, true, false, 'low', 'active', 'Regional vertical licensing product');

-- ============================================================
-- PIPELINES & STAGES
-- ============================================================
INSERT INTO pipelines (pipeline_name, pipeline_type, active_flag) VALUES
('Main Sales Pipeline', 'sales', true),
('Partnership Pipeline', 'partnership', true),
('Referral Pipeline', 'referral', true);

INSERT INTO stages (pipeline_id, stage_name, stage_order, is_closed_won, is_closed_lost, probability_default) VALUES
(1, 'Qualification', 1, false, false, 10),
(1, 'Discovery', 2, false, false, 25),
(1, 'Proposal', 3, false, false, 50),
(1, 'Negotiation', 4, false, false, 75),
(1, 'Closed Won', 5, true, false, 100),
(1, 'Closed Lost', 6, false, true, 0),
(2, 'Initial Contact', 1, false, false, 10),
(2, 'Evaluation', 2, false, false, 30),
(2, 'Agreement', 3, false, false, 60),
(2, 'Active Partnership', 4, true, false, 100),
(3, 'Referral Received', 1, false, false, 15),
(3, 'Referral Qualified', 2, false, false, 40),
(3, 'Referral Converted', 3, true, false, 100);

-- ============================================================
-- DEAL PATHS
-- ============================================================
INSERT INTO deal_paths (path_name, description) VALUES
('Referral', 'Lead sourced through referral partner'),
('Co-Sell', 'Joint selling with partner'),
('Reseller', 'Partner resells the product/service'),
('Implementation', 'Implementation and delivery engagement'),
('Advisory', 'Advisory and consulting engagement'),
('White-Label', 'White-label product delivery');

-- ============================================================
-- LEADS
-- ============================================================
INSERT INTO leads (lead_name, source_type, source_owner_user_id, sponsor_user_id, organization_id, contact_id, geography, vertical, need_type, estimated_value, confidence_score, visibility_level, status, conflict_flag) VALUES
('TechVista CRM Modernization', 'direct', 3, 1, 1, 1, 'Turkey', 'Technology', 'implementation', 150000.00, 75, 'team', 'qualified', false),
('Nordic Digital AI Integration', 'referral', 1, 1, 2, 2, 'Nordics', 'Technology', 'product', 200000.00, 60, 'team', 'qualified', false),
('Berlin Cloud Migration', 'partner', 4, 3, 3, 3, 'Germany', 'Cloud Services', 'implementation', 120000.00, 50, 'team', 'new', false),
('Aegean Digital Advisory', 'direct', 2, 1, 4, 4, 'Greece', 'Consulting', 'advisory', 80000.00, 65, 'team', 'contacted', false),
('Dubai Innovation Platform', 'event', 1, 1, 5, 5, 'UAE', 'Innovation', 'product', 350000.00, 30, 'restricted', 'new', false),
('London FinTech Integration', 'partner', 4, 3, 6, 6, 'UK', 'Financial Services', 'implementation', 250000.00, 70, 'team', 'qualified', false),
('Ankara Gov Digital Platform', 'direct', 1, 2, 9, 9, 'Turkey', 'Government', 'implementation', 500000.00, 80, 'restricted', 'proposal', false),
('US Market Entry - Consulting', 'direct', 7, 1, NULL, NULL, 'US', 'Consulting', 'advisory', 180000.00, 45, 'team', 'new', false);

-- ============================================================
-- LEAD ASSIGNMENTS
-- ============================================================
INSERT INTO lead_assignments (lead_id, assigned_user_id, assignment_type) VALUES
(1, 3, 'technical_lead'),
(1, 1, 'sponsor'),
(2, 1, 'source_owner'),
(2, 5, 'product_owner'),
(3, 4, 'source_owner'),
(3, 3, 'technical_lead'),
(4, 2, 'delivery_lead'),
(5, 1, 'source_owner'),
(6, 4, 'source_owner'),
(6, 3, 'technical_lead'),
(7, 1, 'sponsor'),
(7, 2, 'delivery_lead'),
(8, 7, 'source_owner');

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
INSERT INTO opportunities (opportunity_name, lead_id, account_org_id, deal_owner_user_id, source_owner_user_id, sponsor_user_id, pipeline_id, stage_id, deal_type, estimated_total_value, recurring_value, one_time_value, expected_close_date, visibility_level, win_probability, notes) VALUES
('TechVista CRM Implementation', 1, 1, 3, 3, 1, 1, 3, 'implementation', 150000.00, 30000.00, 120000.00, '2026-06-30', 'team', 50, 'Full CRM modernization project'),
('Nordic AI Chatbot Deployment', 2, 2, 5, 1, 1, 1, 2, 'product', 200000.00, 80000.00, 120000.00, '2026-05-15', 'team', 60, 'SmartChat Pro deployment for Nordic Digital'),
('London FinTech Platform', 6, 6, 4, 4, 3, 1, 4, 'co-sell', 250000.00, 100000.00, 150000.00, '2026-04-30', 'team', 75, 'Enterprise bridge for FinTech client'),
('Ankara Gov Digital Transformation', 7, 9, 1, 1, 2, 1, 3, 'implementation', 500000.00, 50000.00, 450000.00, '2026-09-30', 'restricted', 80, 'Large government digital transformation');

-- ============================================================
-- OPPORTUNITY PRODUCTS
-- ============================================================
INSERT INTO opportunity_products (opportunity_id, product_id, role_in_deal, primary_flag) VALUES
(1, 1, 'core_platform', true),
(1, 4, 'integration', false),
(2, 2, 'core_product', true),
(3, 3, 'core_service', true),
(4, 1, 'core_platform', true),
(4, 4, 'integration', false);

-- ============================================================
-- OPPORTUNITY REVENUE SHARES
-- ============================================================
INSERT INTO opportunity_revenue_shares (opportunity_id, beneficiary_user_id, share_type, share_percent, share_basis, payout_status, notes) VALUES
(1, 3, 'delivery', 40.00, 'total_value', 'pending', 'Erol - technical delivery lead'),
(1, 1, 'governance', 10.00, 'total_value', 'pending', 'Fetih - governance oversight'),
(2, 5, 'product', 35.00, 'recurring_value', 'pending', 'Yasin - product owner'),
(2, 1, 'sourcing', 15.00, 'total_value', 'pending', 'Fetih - source owner'),
(3, 4, 'channel', 30.00, 'total_value', 'pending', 'Gökhan - channel partner'),
(3, 3, 'technical', 20.00, 'total_value', 'pending', 'Erol - technical support'),
(4, 1, 'sourcing', 15.00, 'total_value', 'pending', 'Fetih - deal owner'),
(4, 2, 'delivery', 25.00, 'total_value', 'pending', 'Muhittin - delivery management');

-- ============================================================
-- PROJECTS
-- ============================================================
INSERT INTO projects (project_name, opportunity_id, project_owner_user_id, delivery_manager_user_id, technical_lead_user_id, start_date, target_end_date, status, budget, notes) VALUES
('TechVista CRM Phase 1', 1, 1, 2, 3, '2026-04-01', '2026-09-30', 'planning', 150000.00, 'Phase 1 of CRM modernization');

-- ============================================================
-- PROJECT MILESTONES
-- ============================================================
INSERT INTO project_milestones (project_id, milestone_name, due_date, status, owner_user_id, notes) VALUES
(1, 'Requirements & Design', '2026-04-30', 'pending', 3, 'Erol leads technical design'),
(1, 'Development Sprint 1', '2026-06-15', 'pending', 3, 'Core platform development'),
(1, 'UAT & Testing', '2026-08-30', 'pending', 2, 'Muhittin coordinates testing'),
(1, 'Go Live', '2026-09-30', 'pending', 2, 'Production deployment');

-- ============================================================
-- PROPOSALS
-- ============================================================
INSERT INTO proposals (opportunity_id, proposal_number, proposal_date, currency, one_time_amount, recurring_amount, implementation_amount, support_amount, discount_amount, approval_status) VALUES
(1, 'PROP-2026-001', '2026-03-15', 'USD', 120000.00, 30000.00, 80000.00, 20000.00, 10000.00, 'submitted'),
(3, 'PROP-2026-002', '2026-03-01', 'GBP', 150000.00, 100000.00, 60000.00, 15000.00, 5000.00, 'approved'),
(4, 'PROP-2026-003', '2026-03-20', 'USD', 450000.00, 50000.00, 200000.00, 50000.00, 25000.00, 'draft');

-- ============================================================
-- AGREEMENTS
-- ============================================================
INSERT INTO agreements (agreement_type, related_type, related_id, party_1, party_2, start_date, end_date, status, governing_law, notes) VALUES
('NDA', 'organization', 1, 'Alliance Core', 'TechVista Solutions', '2026-01-01', '2027-01-01', 'active', 'Turkish Law', 'Mutual NDA for CRM project'),
('Partnership Agreement', 'organization', 6, 'Alliance Core', 'London FinTech Partners', '2026-02-01', '2027-02-01', 'active', 'English Law', 'Channel partnership agreement'),
('SOW', 'opportunity', 4, 'Alliance Core', 'Ankara Gov Solutions', '2026-03-01', '2027-03-01', 'draft', 'Turkish Law', 'Government project SOW');

-- ============================================================
-- RISKS
-- ============================================================
INSERT INTO risks (related_type, related_id, risk_type, severity, status, owner_user_id, mitigation_notes) VALUES
('opportunity', 4, 'compliance', 'high', 'open', 1, 'Government compliance requirements need legal review'),
('project', 1, 'delivery', 'medium', 'open', 2, 'Timeline tight for Phase 1 delivery'),
('opportunity', 1, 'technical', 'low', 'monitoring', 3, 'Legacy system integration complexity');

-- ============================================================
-- ACTIVITIES
-- ============================================================
INSERT INTO activities (related_type, related_id, activity_type, owner_user_id, activity_date, summary, next_step, private_flag) VALUES
('lead', 1, 'meeting', 3, '2026-03-10 10:00:00', 'Technical discovery call with TechVista CTO', 'Send technical proposal', false),
('lead', 2, 'call', 1, '2026-03-12 14:00:00', 'Initial call with Nordic Digital about AI needs', 'Schedule demo with Yasin', false),
('opportunity', 3, 'meeting', 4, '2026-03-15 11:00:00', 'Partnership review with London FinTech', 'Finalize agreement terms', false),
('opportunity', 4, 'meeting', 1, '2026-03-18 09:00:00', 'Government project kickoff planning', 'Submit compliance review', true),
('lead', 7, 'email', 2, '2026-03-20 16:00:00', 'Follow-up on Ankara project requirements', 'Schedule site visit', false);

-- ============================================================
-- KPI CONTRIBUTIONS
-- ============================================================
INSERT INTO kpi_contributions (user_id, contribution_type, related_type, related_id, metric_name, metric_value, period_start, period_end, notes) VALUES
(1, 'sourcing', 'lead', 2, 'leads_sourced', 1, '2026-03-01', '2026-03-31', 'Nordic Digital lead'),
(3, 'technical', 'opportunity', 1, 'technical_reviews', 1, '2026-03-01', '2026-03-31', 'TechVista technical review'),
(4, 'channel', 'opportunity', 3, 'deals_influenced', 1, '2026-03-01', '2026-03-31', 'London FinTech channel deal'),
(2, 'delivery', 'project', 1, 'projects_managed', 1, '2026-03-01', '2026-03-31', 'TechVista project management'),
(5, 'product', 'opportunity', 2, 'demos_delivered', 1, '2026-03-01', '2026-03-31', 'SmartChat Pro demo');

-- ============================================================
-- OPPORTUNITY ROLES (two-level role system)
-- ============================================================
INSERT INTO opportunity_roles (opportunity_id, user_id, role_in_opportunity, notes) VALUES
(1, 3, 'deal_owner', 'Erol owns the TechVista CRM deal'),
(1, 1, 'sponsor', 'Fetih sponsors the deal'),
(1, 3, 'technical_partner', 'Erol provides technical direction'),
(1, 2, 'delivery_owner', 'Muhittin will manage delivery'),
(2, 5, 'product_owner', 'Yasin owns the SmartChat product'),
(2, 1, 'source_owner', 'Fetih sourced the Nordic lead'),
(2, 3, 'technical_partner', 'Erol provides integration support'),
(3, 4, 'deal_owner', 'Gökhan owns the FinTech deal'),
(3, 4, 'source_owner', 'Gökhan sourced the lead'),
(3, 3, 'technical_partner', 'Erol provides technical support'),
(4, 1, 'deal_owner', 'Fetih owns the government deal'),
(4, 1, 'source_owner', 'Fetih sourced the lead'),
(4, 2, 'delivery_owner', 'Muhittin will manage delivery'),
(4, 3, 'technical_partner', 'Erol is technical lead');

-- ============================================================
-- SHARED ITEMS (for restricted external users)
-- ============================================================
INSERT INTO shared_items (shared_with_user_id, shared_by_user_id, entity_type, entity_id, access_level, notes) VALUES
(8, 1, 'product', 2, 'view', 'Archie can view SmartChat Pro for review'),
(8, 1, 'product', 3, 'view', 'Archie can view Enterprise Bridge'),
(8, 7, 'opportunity', 3, 'view', 'Archie can see London FinTech deal summary'),
(8, 1, 'agreement', 2, 'view', 'Archie can view partnership agreement');

-- ============================================================
-- VISIBILITY REQUESTS (sample governance data)
-- ============================================================
INSERT INTO visibility_requests (requested_by_user_id, entity_type, entity_id, current_visibility, requested_visibility, reason, status) VALUES
(4, 'lead', 5, 'restricted', 'team', 'Need team visibility for Dubai Innovation lead to coordinate with Yasin', 'pending'),
(7, 'opportunity', 4, 'restricted', 'team', 'Need visibility on Ankara deal for US consulting support', 'pending');
