-- ============================================================
-- EXTRA SEED DATA v2: At least 15 feature rows per user
-- Users: 1=Fetih, 2=Muhittin, 3=Erol, 4=Gökhan, 5=Yasin, 6=İbrahim, 7=Michael, 8=Archie
-- ============================================================

-- ===================== ORGANIZATIONS (8 new, IDs 17-24) =====================
INSERT INTO organizations (org_name, org_type, country, industry, website, owner_user_id) VALUES
('Prague Innovation Lab','partner','Czech Republic','Technology','https://prague-lab.cz',6),
('Dublin FinServe','customer','Ireland','Finance','https://dublin-finserve.ie',7),
('Stockholm GreenTech','prospect','Sweden','CleanTech','https://stockholm-green.se',5),
('Rome Smart City','prospect','Italy','Government','https://rome-smart.it',4),
('Tokyo Digital Bridge','partner','Japan','Technology','https://tokyo-bridge.jp',7),
('Bucharest DataWorks','prospect','Romania','Technology','https://bucharest-data.ro',6),
('Helsinki Cloud','customer','Finland','Cloud','https://helsinki-cloud.fi',2),
('Istanbul Commerce Hub','prospect','Turkey','E-Commerce','https://istanbul-commerce.com.tr',4);

-- ===================== CONTACTS (spread across all users) =====================
INSERT INTO contacts (first_name, last_name, title, email, phone, organization_id, owner_user_id) VALUES
-- Muhittin (user 2) contacts
('Deniz','Yılmaz','Project Manager','deniz@nordic.dk','+45-5551001',2,2),
('Lars','Eriksen','CTO','lars@nordic.dk','+45-5551002',2,2),
('Sibel','Kaya','Director','sibel@aegean.com','+90-5551003',4,2),
('Markku','Virtanen','Cloud Architect','markku@helsinki.fi','+358-5551030',23,2),
-- Erol (user 3) contacts
('Viktor','Petrov','Engineer','viktor@sofia.bg','+359-5551004',7,3),
('Clara','Dubois','VP Sales','clara@paris.fr','+33-5551005',10,3),
('Ion','Popescu','Data Engineer','ion@bucharest.ro','+40-5551031',22,3),
-- Gökhan (user 4) contacts
('Hans','Mueller','CIO','hans@berlin.de','+49-5551006',3,4),
('Fatma','Demir','Managing Director','fatma@dubai.ae','+971-5551007',5,4),
('Elena','Rossi','Product Lead','elena@milan.it','+39-5551008',13,4),
('Pietro','Bianchi','CTO','pietro@milan.it','+39-5551009',13,4),
('Marco','Ferrari','IoT Lead','marco@rome.it','+39-5551032',20,4),
-- Yasin (user 5) contacts
('Maria','Santos','CEO','maria@lisbon.pt','+351-5551010',15,5),
('Jakub','Nowak','Data Lead','jakub@warsaw.pl','+48-5551011',12,5),
('Anna','Weber','HealthTech Director','anna@vienna.at','+43-5551012',14,5),
('Carlos','Garcia','EduTech Director','carlos@barcelona.es','+34-5551013',16,5),
('Sofia','Andersson','Security Lead','sofia@zurich.ch','+41-5551014',11,5),
('Erik','Lindgren','GreenTech CTO','erik@stockholm.se','+46-5551033',19,5),
-- İbrahim (user 6) contacts
('Kemal','Öztürk','IT Director','kemal@ankara.gov.tr','+90-5551015',9,6),
('Ayşe','Çelik','Tech Lead','ayse@istanbul.com','+90-5551016',1,6),
('Mehmet','Aydın','Partner Manager','mehmet@aegean.com','+90-5551017',4,6),
('Burak','Şahin','AI Researcher','burak@amsterdam.nl','+31-5551018',8,6),
('Elif','Koç','Analyst','elif@zurich.ch','+41-5551019',11,6),
('Jan','Kowalski','Analytics Lead','jan@warsaw.pl','+48-5551034',12,6),
-- Michael (user 7) contacts
('James','Wilson','VP Business Dev','james@nyc.us','+1-5551020',5,7),
('Sarah','Johnson','Finance Director','sarah@london.uk','+44-5551021',6,7),
('Robert','Chen','Tech Advisor','robert@sf.us','+1-5551022',1,7),
('Emily','Brown','Strategy Lead','emily@nyc.us','+1-5551023',10,7),
('David','Miller','Partnerships','david@london.uk','+44-5551024',6,7),
('Takeshi','Yamamoto','Digital Lead','takeshi@tokyo.jp','+81-5551035',21,7),
-- Fetih (user 1) extra contacts
('Özge','Arslan','Innovation Lead','ozge@dubai.ae','+971-5551025',5,1),
('Hakan','Tunç','Deputy CIO','hakan@ankara.gov.tr','+90-5551026',9,1),
('Petra','Novak','Lab Director','petra@prague.cz','+420-5551036',17,1);

-- ===================== LEADS (spread across all users, with referrals) =====================
INSERT INTO leads (lead_name, source_owner_user_id, source_type, sponsor_user_id, organization_id, geography, vertical, need_type, estimated_value, status, conflict_flag, visibility_level) VALUES
-- Fetih (user 1) leads
('Prague Lab AI Pilot',1,'event',2,17,'Czech Republic','Technology','consulting',90000,'new',false,'team'),
('Helsinki Cloud Migration',1,'referral',2,23,'Finland','Cloud','implementation',180000,'qualified',false,'team'),
('Dubai Innovation Hub 2.0',1,'direct',3,5,'UAE','Innovation','platform',350000,'contacted',false,'team'),
-- Muhittin (user 2) leads
('Rome Smart City Platform',2,'direct',1,20,'Italy','Government','platform',300000,'contacted',false,'team'),
('Dublin Banking Platform',2,'partner',1,18,'Ireland','Finance','implementation',250000,'qualified',false,'team'),
('Stockholm Green Analytics',2,'referral',3,19,'Sweden','CleanTech','analytics',120000,'new',false,'team'),
('Helsinki Enterprise Cloud',2,'direct',1,23,'Finland','Cloud','migration',200000,'qualified',false,'team'),
-- Erol (user 3) leads
('Zurich Security Audit',3,'direct',1,11,'Switzerland','Cybersecurity','consulting',95000,'contacted',false,'team'),
('Bucharest Data Pipeline',3,'partner',2,22,'Romania','Technology','implementation',140000,'new',false,'team'),
('Sofia AI Research Lab',3,'direct',2,7,'Bulgaria','Technology','research',110000,'qualified',false,'team'),
-- Gökhan (user 4) leads
('Milan Smart Factory IoT',4,'partner',3,13,'Italy','Manufacturing','iot',175000,'qualified',true,'team'),
('Tokyo Digital Expansion',4,'referral',1,21,'Japan','Technology','consulting',220000,'new',false,'team'),
('Rome Smart Transport',4,'partner',3,20,'Italy','Government','iot',160000,'contacted',false,'team'),
('Istanbul Commerce AI',4,'referral',1,24,'Turkey','E-Commerce','ai',130000,'qualified',false,'team'),
-- Yasin (user 5) leads
('Barcelona EduTech SaaS',5,'referral',2,16,'Spain','Education','saas',80000,'qualified',false,'team'),
('Vienna HealthTech App',5,'direct',3,14,'Austria','Healthcare','mobile',110000,'contacted',false,'team'),
('Stockholm GreenTech Analytics',5,'referral',1,19,'Sweden','CleanTech','analytics',95000,'new',false,'team'),
('Lisbon Energy Platform',5,'referral',2,15,'Portugal','Energy','platform',140000,'qualified',false,'team'),
-- İbrahim (user 6) leads
('Warsaw Data Analytics',6,'referral',1,12,'Poland','Analytics','platform',160000,'new',false,'team'),
('Ankara Digital Services',6,'direct',2,9,'Turkey','Government','platform',280000,'qualified',false,'team'),
('Istanbul E-Commerce AI',6,'partner',3,24,'Turkey','E-Commerce','ai',95000,'contacted',false,'team'),
('Prague Lab Partnership',6,'referral',1,17,'Czech Republic','Technology','partnership',120000,'new',false,'team'),
-- Michael (user 7) leads
('Dublin FinTech Integration',7,'referral',1,18,'Ireland','Finance','integration',200000,'qualified',false,'team'),
('Tokyo Market Entry',7,'direct',3,21,'Japan','Technology','consulting',150000,'new',false,'team'),
('Stockholm SaaS Advisory',7,'referral',2,19,'Sweden','Technology','consulting',75000,'contacted',false,'team'),
('NYC FinServe Platform',7,'direct',1,18,'USA','Finance','platform',300000,'qualified',false,'team');

-- ===================== OPPORTUNITIES (12 new, spread across users) =====================
INSERT INTO opportunities (opportunity_name, account_org_id, deal_owner_user_id, source_owner_user_id, sponsor_user_id, stage_id, estimated_total_value, expected_close_date, conflict_flag, visibility_level, compliance_review_status) VALUES
-- Muhittin (user 2) deals
('Rome Smart City Implementation',20,2,2,1,3,300000,'2026-07-15',false,'team','pending'),
('Dublin Banking Modernization',18,2,2,1,2,250000,'2026-08-01',false,'team','approved'),
-- Erol (user 3) deals
('Zurich Security Platform',11,3,3,1,4,95000,'2026-06-01',false,'team',NULL),
('Bucharest Data Platform',22,3,3,2,1,140000,'2026-09-15',false,'team','pending'),
-- Gökhan (user 4) deals
('Milan IoT Factory Suite',13,4,4,3,3,175000,'2026-07-01',true,'team','pending'),
('Tokyo Digital Platform',21,4,4,1,1,220000,'2026-10-01',false,'team',NULL),
-- Yasin (user 5) deals
('Barcelona EduTech Platform',16,5,5,2,2,80000,'2026-08-15',false,'team','approved'),
('Vienna Health App',14,5,5,3,4,110000,'2026-06-15',false,'team','pending'),
-- İbrahim (user 6) deals
('Warsaw Analytics Dashboard',12,6,6,1,3,160000,'2026-09-01',false,'team','pending'),
('Ankara Gov Digital Suite',9,6,6,2,2,280000,'2026-11-01',false,'team',NULL),
-- Michael (user 7) deals
('Dublin FinTech Bridge',18,7,7,1,4,200000,'2026-07-01',false,'team','pending'),
('Tokyo Market Platform',21,7,7,3,1,150000,'2026-10-15',false,'team',NULL);

-- ===================== PRODUCTS (10 new, spread across users) =====================
INSERT INTO products (product_name, category, owner_user_id, maturity_level, demo_available, recurring_model, status) VALUES
('CloudSync Pro','cloud',1,'mature',true,true,'active'),
('DataVault Enterprise','data',2,'growth',true,false,'active'),
('IoT Hub Manager','iot',4,'mvp',true,false,'active'),
('AI Document Analyzer','ai',3,'growth',true,true,'active'),
('EduLearn Platform','education',5,'mvp',false,true,'active'),
('GovConnect Suite','government',6,'planning',false,false,'active'),
('FinBridge API','finance',7,'growth',true,true,'active'),
('SecureID Manager','security',3,'mature',true,true,'active'),
('SmartRetail Analytics','retail',5,'growth',true,false,'active'),
('HealthTrack Mobile','healthcare',6,'mvp',false,false,'active');

-- ===================== PROJECTS (8 new) =====================
INSERT INTO projects (project_name, opportunity_id, project_owner_user_id, delivery_manager_user_id, technical_lead_user_id, start_date, target_end_date, status, budget) VALUES
('Rome Smart City - Phase 1',5,2,2,3,'2026-04-01','2026-09-30','planning',250000),
('Dublin Banking - Core Module',6,2,1,3,'2026-03-15','2026-07-15','in_progress',180000),
('Zurich Security - Assessment',7,3,2,3,'2026-04-15','2026-06-30','planning',80000),
('Milan IoT - Pilot Deploy',9,1,2,3,'2026-05-01','2026-08-31','planning',150000),
('Barcelona EduTech - MVP',11,5,2,3,'2026-04-01','2026-07-01','in_progress',60000),
('Warsaw Analytics - Build',13,2,1,3,'2026-05-15','2026-10-15','planning',130000),
('Ankara Gov - Infrastructure',14,1,2,3,'2026-06-01','2026-12-31','planning',250000),
('Dublin FinTech - Integration',15,7,2,3,'2026-04-01','2026-08-01','in_progress',170000);

-- ===================== ACTIVITIES (5+ per user) =====================
INSERT INTO activities (related_type, related_id, activity_type, owner_user_id, activity_date, summary, next_step, private_flag) VALUES
-- Fetih (user 1)
('opportunity',4,'meeting',1,'2026-03-25 10:00','Ankara Gov compliance review with legal team','Submit compliance docs',false),
('lead',14,'call',1,'2026-03-24 14:00','Prague Lab initial discovery call','Send proposal outline',false),
('opportunity',4,'email',1,'2026-03-22 09:00','Gov project budget approval request','Wait for ministry response',false),
('lead',15,'meeting',1,'2026-03-20 11:00','Helsinki Cloud requirements workshop','Prepare architecture doc',false),
('lead',16,'call',1,'2026-03-19 14:00','Dubai Innovation Hub strategy session','Draft partnership plan',false),
-- Muhittin (user 2)
('opportunity',5,'meeting',2,'2026-03-26 09:00','Rome project kickoff planning','Define milestones',false),
('opportunity',6,'call',2,'2026-03-25 15:00','Dublin banking module review','Update delivery timeline',false),
('lead',17,'email',2,'2026-03-24 10:00','Rome city council proposal follow-up','Schedule demo',false),
('lead',19,'meeting',2,'2026-03-23 14:00','Stockholm Green Analytics discovery','Prepare eco-metrics proposal',false),
('opportunity',6,'call',2,'2026-03-22 11:00','Dublin banking compliance check','Send updated SLA',false),
('lead',20,'meeting',2,'2026-03-21 09:00','Helsinki Enterprise Cloud scoping','Draft migration plan',false),
-- Erol (user 3)
('opportunity',7,'meeting',3,'2026-03-26 10:00','Zurich security architecture deep-dive','Finalize threat model',false),
('opportunity',1,'call',3,'2026-03-25 14:00','TechVista CRM technical review','Code review session',false),
('lead',21,'email',3,'2026-03-24 09:00','Zurich security audit scoping document','Schedule pentest',false),
('opportunity',8,'meeting',3,'2026-03-23 11:00','Bucharest data pipeline architecture','Create ERD diagrams',false),
('lead',23,'call',3,'2026-03-22 15:00','Sofia AI lab requirements gathering','Send tech questionnaire',false),
-- Gökhan (user 4)
('opportunity',3,'meeting',4,'2026-03-26 14:00','London FinTech contract negotiation','Review legal terms',false),
('lead',24,'call',4,'2026-03-25 10:00','Milan IoT factory site assessment','Schedule factory visit',false),
('opportunity',9,'email',4,'2026-03-24 16:00','Milan IoT proposal revision','Send updated pricing',false),
('lead',25,'meeting',4,'2026-03-23 09:00','Tokyo digital expansion strategy','Prepare market analysis',false),
('opportunity',10,'call',4,'2026-03-22 14:00','Tokyo platform requirements','Draft feature list',false),
('lead',27,'email',4,'2026-03-21 11:00','Rome Smart Transport initial outreach','Send capability deck',false),
-- Yasin (user 5)
('opportunity',2,'meeting',5,'2026-03-26 11:00','Nordic AI chatbot user testing','Collect feedback report',false),
('lead',29,'call',5,'2026-03-25 15:00','Barcelona EduTech curriculum mapping','Send integration spec',false),
('opportunity',11,'email',5,'2026-03-24 09:00','Barcelona platform UX review','Share wireframes',false),
('lead',30,'meeting',5,'2026-03-23 14:00','Vienna health app requirements','Create user stories',false),
('opportunity',12,'call',5,'2026-03-22 10:00','Vienna health GDPR compliance check','Schedule DPO meeting',false),
('lead',31,'email',5,'2026-03-21 09:00','Stockholm GreenTech platform scoping','Prepare sustainability metrics',false),
-- İbrahim (user 6)
('lead',33,'meeting',6,'2026-03-26 10:00','Warsaw data analytics demo','Prepare sample dashboards',false),
('lead',34,'call',6,'2026-03-25 14:00','Ankara digital services scoping','Draft requirements doc',false),
('lead',35,'email',6,'2026-03-24 11:00','Istanbul e-commerce AI proposal','Create demo environment',false),
('opportunity',13,'meeting',6,'2026-03-23 09:00','Warsaw analytics sprint planning','Define sprint backlog',false),
('opportunity',14,'call',6,'2026-03-22 15:00','Ankara gov infrastructure review','Update capacity plan',false),
('lead',36,'meeting',6,'2026-03-21 10:00','Prague Lab partnership discussion','Prepare MOU draft',false),
-- Michael (user 7)
('lead',37,'meeting',7,'2026-03-26 09:00','Dublin FinTech integration planning','Map API endpoints',false),
('lead',38,'call',7,'2026-03-25 11:00','Tokyo market research presentation','Compile competitor analysis',false),
('opportunity',15,'email',7,'2026-03-24 14:00','Dublin FinTech bridge API spec','Review with tech team',false),
('lead',39,'meeting',7,'2026-03-23 10:00','Stockholm SaaS advisory kickoff','Define engagement scope',false),
('opportunity',16,'call',7,'2026-03-22 16:00','Tokyo platform localization','Research JP compliance',false),
('lead',40,'email',7,'2026-03-21 10:00','NYC FinServe platform requirements','Draft solution architecture',false),
-- Archie (user 8) limited activities
('opportunity',3,'email',8,'2026-03-25 10:00','Review shared London FinTech docs','Provide advisory feedback',false),
('opportunity',3,'call',8,'2026-03-23 14:00','Advisory call on FinTech compliance','Send written recommendations',false);

-- ===================== KPI CONTRIBUTIONS (4+ per user) =====================
INSERT INTO kpi_contributions (user_id, contribution_type, related_type, related_id, metric_name, metric_value, period_start, period_end, notes) VALUES
-- Fetih (user 1)
(1,'sourcing','lead',14,'leads_sourced',1,'2026-03-01','2026-03-31','Prague Lab lead'),
(1,'governance','opportunity',4,'compliance_reviews',1,'2026-03-01','2026-03-31','Ankara Gov compliance'),
(1,'sourcing','lead',15,'leads_sourced',1,'2026-03-01','2026-03-31','Helsinki Cloud lead'),
(1,'governance','opportunity',1,'governance_reviews',1,'2026-03-01','2026-03-31','TechVista governance'),
-- Muhittin (user 2)
(2,'delivery','project',1,'projects_managed',1,'2026-03-01','2026-03-31','TechVista project'),
(2,'delivery','opportunity',5,'projects_managed',1,'2026-03-01','2026-03-31','Rome project'),
(2,'sourcing','lead',17,'leads_sourced',1,'2026-03-01','2026-03-31','Rome Smart City lead'),
(2,'coordination','opportunity',6,'milestones_completed',2,'2026-03-01','2026-03-31','Dublin milestones'),
-- Erol (user 3)
(3,'technical','opportunity',7,'technical_reviews',1,'2026-03-01','2026-03-31','Zurich security review'),
(3,'technical','opportunity',8,'technical_reviews',1,'2026-03-01','2026-03-31','Bucharest data review'),
(3,'delivery','opportunity',7,'architecture_designs',1,'2026-03-01','2026-03-31','Zurich security design'),
(3,'sourcing','lead',21,'leads_sourced',1,'2026-03-01','2026-03-31','Zurich lead'),
-- Gökhan (user 4)
(4,'sourcing','lead',24,'leads_sourced',1,'2026-03-01','2026-03-31','Milan IoT lead'),
(4,'sourcing','lead',25,'leads_sourced',1,'2026-03-01','2026-03-31','Tokyo lead'),
(4,'revenue','opportunity',3,'deals_progressed',1,'2026-03-01','2026-03-31','London FinTech negotiation'),
(4,'partner','opportunity',9,'partner_engagements',1,'2026-03-01','2026-03-31','Milan IoT partnership'),
-- Yasin (user 5)
(5,'product','opportunity',2,'product_demos',2,'2026-03-01','2026-03-31','Nordic AI demos'),
(5,'sourcing','lead',29,'leads_sourced',1,'2026-03-01','2026-03-31','Barcelona lead'),
(5,'product','opportunity',11,'product_integrations',1,'2026-03-01','2026-03-31','Barcelona platform'),
(5,'product','opportunity',12,'product_reviews',1,'2026-03-01','2026-03-31','Vienna health review'),
-- İbrahim (user 6)
(6,'sourcing','lead',33,'leads_sourced',1,'2026-03-01','2026-03-31','Warsaw lead'),
(6,'sourcing','lead',34,'leads_sourced',1,'2026-03-01','2026-03-31','Ankara lead'),
(6,'product','opportunity',13,'product_deployments',1,'2026-03-01','2026-03-31','Warsaw deployment'),
(6,'product','lead',35,'product_demos',1,'2026-03-01','2026-03-31','Istanbul e-commerce demo'),
-- Michael (user 7)
(7,'sourcing','lead',37,'leads_sourced',1,'2026-03-01','2026-03-31','Dublin FinTech lead'),
(7,'sourcing','lead',38,'leads_sourced',1,'2026-03-01','2026-03-31','Tokyo lead'),
(7,'revenue','opportunity',15,'deals_progressed',1,'2026-03-01','2026-03-31','Dublin FinTech bridge'),
(7,'consulting','lead',39,'advisory_sessions',2,'2026-03-01','2026-03-31','Stockholm advisory');

-- ===================== OPPORTUNITY ROLES (spread across users) =====================
INSERT INTO opportunity_roles (opportunity_id, user_id, role_in_opportunity, notes) VALUES
(5,2,'project_lead','Rome Smart City project lead'),
(5,3,'technical_architect','Rome technical oversight'),
(6,2,'delivery_manager','Dublin Banking delivery'),
(6,3,'technical_reviewer','Dublin Banking tech review'),
(6,1,'sponsor','Dublin Banking governance'),
(7,3,'solution_architect','Zurich Security architect'),
(7,1,'sponsor','Zurich governance sponsor'),
(8,3,'technical_lead','Bucharest data architecture'),
(8,2,'coordinator','Bucharest coordination'),
(9,4,'deal_owner','Milan IoT deal owner'),
(9,3,'technical_advisor','Milan IoT tech advisor'),
(10,4,'business_owner','Tokyo Digital platform owner'),
(10,7,'market_bridge','Tokyo US market liaison'),
(11,5,'product_owner','Barcelona EduTech product'),
(11,2,'coordinator','Barcelona coordination'),
(12,5,'product_owner','Vienna Health product owner'),
(12,3,'technical_reviewer','Vienna Health tech review'),
(13,6,'product_partner','Warsaw Analytics product'),
(13,2,'project_coordinator','Warsaw project coordination'),
(14,6,'product_partner','Ankara Gov product partner'),
(14,1,'governance_lead','Ankara governance'),
(15,7,'deal_owner','Dublin FinTech bridge deal'),
(15,2,'delivery_coordinator','Dublin FinTech coordination'),
(16,7,'market_lead','Tokyo Market platform lead'),
(16,4,'partner_liaison','Tokyo partner connection');

-- ===================== REVENUE SHARES =====================
INSERT INTO opportunity_revenue_shares (opportunity_id, beneficiary_user_id, share_type, share_percent, share_basis, calc_amount, payout_status, notes) VALUES
-- Fetih governance shares
(5,1,'governance',10.00,'total_value',30000,'pending','Fetih - Rome governance'),
(7,1,'governance',10.00,'total_value',9500,'pending','Fetih - Zurich governance'),
(14,1,'governance',10.00,'total_value',28000,'pending','Fetih - Ankara governance'),
-- Muhittin shares
(5,2,'delivery',25.00,'total_value',75000,'pending','Muhittin - Rome delivery'),
(6,2,'delivery',20.00,'total_value',50000,'pending','Muhittin - Dublin delivery'),
-- Erol shares
(7,3,'technical',35.00,'total_value',33250,'pending','Erol - Zurich technical'),
(8,3,'technical',30.00,'total_value',42000,'pending','Erol - Bucharest technical'),
(5,3,'technical',15.00,'total_value',45000,'pending','Erol - Rome technical'),
-- Gökhan shares
(9,4,'channel',35.00,'total_value',61250,'pending','Gökhan - Milan channel'),
(10,4,'channel',30.00,'total_value',66000,'pending','Gökhan - Tokyo channel'),
-- Yasin shares
(11,5,'product',40.00,'total_value',32000,'pending','Yasin - Barcelona product'),
(12,5,'product',35.00,'total_value',38500,'pending','Yasin - Vienna product'),
(2,5,'product',25.00,'total_value',62500,'paid','Yasin - Nordic AI product'),
-- İbrahim shares
(13,6,'product',30.00,'total_value',48000,'pending','İbrahim - Warsaw product'),
(14,6,'product',25.00,'total_value',70000,'pending','İbrahim - Ankara product'),
-- Michael shares
(15,7,'channel',30.00,'total_value',60000,'pending','Michael - Dublin bridge'),
(16,7,'channel',25.00,'total_value',37500,'pending','Michael - Tokyo market');

-- ===================== RISKS =====================
INSERT INTO risks (related_type, related_id, risk_type, severity, status, owner_user_id, mitigation_notes) VALUES
('opportunity',5,'delivery','medium','open',2,'Rome city council approval delays - regular status meetings'),
('opportunity',6,'financial','high','open',2,'Dublin banking budget overrun risk - weekly budget reviews'),
('opportunity',7,'technical','high','open',3,'Zurich zero-day vulnerability - engage external pentest team'),
('opportunity',8,'technical','medium','open',3,'Bucharest data migration complexity - POC migration first'),
('opportunity',9,'delivery','medium','open',4,'Milan factory floor access restrictions - remote monitoring backup'),
('opportunity',11,'delivery','low','open',5,'Barcelona MVP scope creep - strict change control process'),
('opportunity',14,'compliance','high','open',1,'Ankara government procurement regulations - legal review'),
('opportunity',15,'financial','medium','open',7,'Dublin FinTech API rate limiting - load testing before go-live'),
('opportunity',13,'technical','medium','open',6,'Warsaw legacy data format incompatibility - build ETL layer');

-- ===================== AGREEMENTS =====================
INSERT INTO agreements (agreement_type, related_type, related_id, party_1, party_2, start_date, end_date, status, governing_law, notes) VALUES
('Partnership Agreement','partner',2,'Alliance','Nordic Digital Labs','2026-01-01','2027-01-01','active','Denmark','Nordic partnership terms'),
('NDA','opportunity',5,'Alliance','Rome Smart City','2026-03-01','2027-03-01','active','Italy','Rome project NDA'),
('Service Agreement','opportunity',6,'Alliance','Dublin FinServe','2026-03-15','2026-12-31','active','Ireland','Dublin banking SLA'),
('Partnership Agreement','partner',3,'Alliance','Berlin Cloud GmbH','2026-02-01','2027-02-01','active','Germany','Berlin partnership'),
('NDA','opportunity',7,'Alliance','Zurich SecureNet','2026-04-01','2027-04-01','draft','Switzerland','Zurich security NDA'),
('Service Agreement','opportunity',9,'Alliance','Milan Smart Factory','2026-05-01','2027-05-01','draft','Italy','Milan IoT SLA'),
('Consulting Agreement','opportunity',15,'Alliance','Dublin FinServe','2026-04-01','2026-10-01','draft','Ireland','Dublin FinTech consulting'),
('Service Agreement','opportunity',14,'Alliance','Ankara Gov Solutions','2026-06-01','2027-06-01','draft','Turkey','Ankara gov SLA'),
('Partnership Agreement','partner',5,'Alliance','Tokyo Digital Bridge','2026-03-01','2027-03-01','active','Japan','Tokyo partnership');

-- ===================== PROPOSALS =====================
INSERT INTO proposals (opportunity_id, proposal_number, proposal_date, currency, one_time_amount, recurring_amount, implementation_amount, support_amount, discount_amount, approval_status) VALUES
(5,'PROP-2026-004','2026-03-20','EUR',50000,NULL,200000,50000,0,'submitted'),
(6,'PROP-2026-005','2026-03-18','EUR',30000,NULL,150000,40000,10000,'approved'),
(7,'PROP-2026-006','2026-03-22','CHF',20000,5000,50000,20000,0,'submitted'),
(8,'PROP-2026-007','2026-03-25','EUR',15000,NULL,100000,25000,5000,'draft'),
(9,'PROP-2026-008','2026-03-19','EUR',40000,10000,100000,25000,0,'submitted'),
(11,'PROP-2026-009','2026-03-15','EUR',10000,5000,40000,15000,5000,'approved'),
(12,'PROP-2026-010','2026-03-21','EUR',15000,3000,60000,20000,0,'submitted'),
(13,'PROP-2026-011','2026-03-24','EUR',20000,NULL,100000,30000,10000,'draft'),
(14,'PROP-2026-012','2026-04-01','TRY',100000,NULL,500000,150000,50000,'draft'),
(15,'PROP-2026-013','2026-03-26','EUR',25000,8000,120000,30000,0,'submitted'),
(16,'PROP-2026-014','2026-03-28','USD',30000,NULL,80000,20000,5000,'draft');

-- ===================== PARTNER ENTITIES =====================
INSERT INTO partner_entities (entity_name, entity_type, billing_capability, active_status, geography, website, contact_email) VALUES
('Prague Innovation Lab','technology_partner','direct_billing',true,'Czech Republic','https://prague-lab.cz','info@prague-lab.cz'),
('Dublin FinServe Ltd','financial_partner','direct_billing',true,'Ireland','https://dublin-finserve.ie','partners@dublin-finserve.ie'),
('Stockholm GreenTech AB','technology_partner','via_alliance',true,'Sweden','https://stockholm-green.se','biz@stockholm-green.se'),
('Rome Smart Solutions SRL','consulting_partner','direct_billing',true,'Italy','https://rome-smart.it','info@rome-smart.it'),
('Bucharest DataWorks SRL','technology_partner','via_alliance',true,'Romania','https://bucharest-data.ro','dev@bucharest-data.ro');

-- ===================== SHARED ITEMS (lots for Archie + some cross-user) =====================
INSERT INTO shared_items (shared_with_user_id, shared_by_user_id, entity_type, entity_id, access_level, notes) VALUES
-- More shared with Archie (user 8)
(8,1,'lead',14,'view','Archie can review Prague Lab lead'),
(8,3,'product',9,'view','Archie can view AI Document Analyzer'),
(8,2,'opportunity',5,'view','Archie can review Rome project'),
(8,7,'opportunity',15,'view','Archie can view Dublin FinTech deal'),
(8,1,'product',6,'view','Archie can view CloudSync Pro'),
(8,3,'product',13,'view','Archie can view SecureID Manager'),
(8,1,'agreement',1,'view','Archie can view main partnership agreement'),
(8,7,'lead',37,'view','Archie can review Dublin FinTech lead'),
(8,1,'product',11,'view','Archie can view GovConnect Suite'),
(8,5,'product',10,'view','Archie can view EduLearn Platform'),
(8,4,'lead',24,'view','Archie can review Milan IoT lead'),
-- Cross-user sharing
(6,1,'opportunity',4,'view','İbrahim can view Ankara Gov deal'),
(7,4,'lead',25,'view','Michael can view Tokyo lead'),
(5,3,'opportunity',7,'view','Yasin can view Zurich deal for product input');

-- ===================== VISIBILITY REQUESTS =====================
INSERT INTO visibility_requests (requested_by_user_id, entity_type, entity_id, current_visibility, requested_visibility, reason, status) VALUES
(4,'opportunity',9,'team','restricted','Milan IoT deal is sensitive - competitor intelligence','pending'),
(5,'lead',29,'team','restricted','Barcelona education deal - pre-announcement','pending'),
(6,'opportunity',13,'team','restricted','Warsaw deal involves government contract','pending'),
(3,'opportunity',7,'team','restricted','Zurich security audit - classified information','pending'),
(7,'opportunity',15,'team','restricted','Dublin FinTech - regulatory sensitivity','pending');

-- ===================== RELATIONSHIP LINKS (so partners see more contacts) =====================
INSERT INTO relationship_links (contact_id, known_by_user_id, relationship_strength, notes) VALUES
-- Gökhan (user 4) knows more contacts
(1,4,'strong','Met at TechVista conference'),
(6,4,'medium','Berlin Cloud introduction'),
-- Yasin (user 5) knows contacts
(10,5,'medium','Lisbon conference contact'),
(11,5,'strong','Warsaw analytics connection'),
(12,5,'medium','Vienna health intro'),
-- İbrahim (user 6) knows contacts
(9,6,'strong','Ankara gov relationship'),
(1,6,'medium','TechVista tech contact'),
-- Michael (user 7) knows contacts
(6,7,'strong','London FinTech connection'),
(5,7,'medium','Dubai innovation intro'),
-- Archie relationship
(6,8,'medium','London advisory connection');

-- ===================== PROJECT MILESTONES =====================
INSERT INTO project_milestones (project_id, milestone_name, due_date, status, owner_user_id, notes) VALUES
(1,'Requirements Complete','2026-02-15','completed',3,'TechVista requirements done'),
(1,'Design Review','2026-03-01','completed',3,'TechVista design approved'),
(1,'UAT Start','2026-04-01','pending',3,'TechVista UAT planning'),
(2,'Rome Requirements','2026-04-15','pending',2,'Rome city council requirements'),
(2,'Rome Architecture','2026-05-01','pending',3,'Rome system architecture'),
(3,'Dublin Core Module','2026-04-01','pending',3,'Dublin banking core'),
(3,'Dublin Integration Test','2026-05-15','pending',2,'Dublin integration testing'),
(3,'Dublin UAT','2026-06-15','pending',2,'Dublin user acceptance'),
(4,'Zurich Assessment Plan','2026-04-20','pending',3,'Zurich security assessment'),
(6,'Barcelona MVP Design','2026-04-15','pending',5,'Barcelona EduTech design'),
(6,'Barcelona MVP Dev','2026-05-15','pending',5,'Barcelona development sprint'),
(9,'Dublin API Design','2026-04-10','pending',7,'Dublin FinTech API design'),
(9,'Dublin API Integration','2026-05-10','pending',7,'Dublin API integration');

-- ===================== LEAD ASSIGNMENTS (so partners see more leads in dashboard) =====================
INSERT INTO lead_assignments (lead_id, assigned_user_id, assignment_type) VALUES
(14,6,'support'),
(24,6,'review'),
(25,7,'support'),
(15,7,'review'),
(22,5,'support'),
(24,5,'review'),
(14,4,'review'),
(34,4,'support');

-- Conflict flags
UPDATE leads SET conflict_flag = true WHERE id IN (3, 7, 15, 22, 28);
UPDATE opportunities SET conflict_flag = true WHERE id IN (2, 5, 9, 12);

-- Opportunity deal paths
INSERT INTO opportunity_paths (opportunity_id, deal_path_id, primary_flag) VALUES
  (1, 1, true), (2, 2, true), (3, 3, true), (4, 4, true), (5, 5, true),
  (6, 1, true), (7, 2, true), (8, 3, true), (9, 4, true), (10, 1, true),
  (11, 2, true), (12, 3, true), (13, 5, true), (14, 4, true), (15, 1, true)
ON CONFLICT DO NOTHING;

-- Compliance reviews
INSERT INTO compliance_reviews (related_type, related_id, personal_data_flag, recording_flag, eu_data_flag, dpa_required_flag, security_review_flag, ip_license_required_flag, reviewer_user_id, review_status, notes) VALUES
  ('opportunity', 1, true, false, true, true, false, false, 1, 'approved', 'EU data handling review completed'),
  ('opportunity', 2, false, true, false, false, true, false, 2, 'pending', 'Security review needed for cloud deployment'),
  ('opportunity', 3, true, false, true, true, true, true, 1, 'in_review', 'Complex compliance - multiple flags'),
  ('opportunity', 5, false, false, false, false, false, true, 3, 'approved', 'IP license for reseller agreement reviewed'),
  ('lead', 1, true, false, true, false, false, false, 1, 'pending', 'Personal data handling assessment needed'),
  ('project', 1, false, true, false, false, true, false, 2, 'approved', 'Security cleared for implementation'),
  ('agreement', 1, true, false, true, true, false, false, 1, 'in_review', 'DPA clause review in progress'),
  ('opportunity', 7, false, false, false, false, true, true, 3, 'pending', 'Security and IP review required'),
  ('opportunity', 8, true, true, true, true, true, false, 1, 'approved', 'Full compliance review passed'),
  ('opportunity', 10, false, false, true, false, false, false, 2, 'pending', 'EU data flag check'),
  ('opportunity', 4, true, false, false, true, false, false, 1, 'pending', 'DPA review for partner engagement'),
  ('opportunity', 6, false, true, true, false, true, false, 3, 'in_review', 'Recording and EU data flags'),
  ('lead', 5, true, false, true, true, false, false, 2, 'approved', 'Cleared for processing'),
  ('lead', 10, false, false, false, false, true, true, 1, 'pending', 'Security and IP assessment'),
  ('project', 3, true, true, true, true, true, true, 2, 'in_review', 'Full compliance check needed');
