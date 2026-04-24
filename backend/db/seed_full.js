const pool = require('../db/connection');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ============================================================
    // 1. ADD MORE ORGANIZATIONS (need more for contacts linkage)
    // ============================================================
    const orgNames = [
      'Prague Cloud Lab', 'Dublin FinServe', 'Stockholm GreenTech', 'Rome Smart City',
      'Tokyo Bridge Corp', 'Bucharest DataWorks', 'Helsinki Cloud', 'Istanbul Commerce Hub',
      'Madrid AI Ventures', 'Oslo Maritime Digital', 'Copenhagen IoT Labs', 'Athens Shipping Tech',
      'Budapest Health Systems', 'Bratislava CyberSec', 'Tallinn GovTech', 'Riga AutomationX',
      'Zagreb Analytics', 'Ljubljana Smart Grid', 'Sarajevo EduConnect', 'Tbilisi FinBridge',
      'Baku Energy Digital', 'Minsk SoftHouse', 'Chisinau AgriTech', 'Skopje TeleHealth',
      'Podgorica TourTech', 'Tirana DataVault', 'Nicosia Maritime AI', 'Malta Gaming Systems',
      'Luxembourg BankTech', 'Reykjavik Geothermal AI', 'Valletta TradeHub', 'Monaco LuxuryTech',
      'Andorra RetailSmart', 'San Marino ArchiveCloud', 'Vaduz WealthTech', 'Edinburgh InsurTech',
      'Manchester HealthAI', 'Liverpool LogiChain', 'Birmingham CyberGuard', 'Leeds EduPlatform',
      'Bristol CleanEnergy', 'Cardiff DataMine', 'Glasgow FinOps', 'Belfast SecurityNet',
      'Cork SaaS Solutions', 'Galway BioTech', 'Limerick RetailAI', 'Waterford DevOps',
    ];

    const newOrgIds = [];
    for (let i = 0; i < orgNames.length; i++) {
      const ownerUserId = (i % 8) + 1;
      const res = await client.query(
        `INSERT INTO organizations (org_name, owner_user_id, org_type, country, created_at)
         VALUES ($1, $2, $3, $4, NOW() - interval '${Math.floor(Math.random() * 180)} days')
         ON CONFLICT DO NOTHING RETURNING id`,
        [orgNames[i], ownerUserId, ['customer', 'partner', 'prospect', 'vendor'][i % 4], ['Germany', 'USA', 'UK', 'Turkey'][i % 4]]
      );
      if (res.rows.length) newOrgIds.push(res.rows[0].id);
    }
    console.log(`Added ${newOrgIds.length} organizations`);

    // ============================================================
    // 2. ADD CONTACTS - 15+ per user for users 4,5,6,7 + extras for 1,2,3
    // ============================================================
    const firstNames = ['Alex', 'Sofia', 'Liam', 'Emma', 'Noah', 'Mia', 'Lucas', 'Olivia', 'Ethan', 'Ava', 'Mason', 'Isabella', 'Logan', 'Sophia', 'Jacob', 'Charlotte', 'Oliver', 'Amelia', 'Daniel', 'Harper'];
    const lastNames = ['Anderson', 'Chen', 'Kumar', 'Mueller', 'Santos', 'Kim', 'Nakamura', 'Petrov', 'Garcia', 'Williams', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Moore', 'Clark', 'Lewis', 'Hall', 'Young', 'King'];

    const allOrgs = await client.query('SELECT id FROM organizations ORDER BY id');
    const orgIds = allOrgs.rows.map(r => r.id);

    let contactCount = 0;
    for (let userId = 1; userId <= 8; userId++) {
      const existing = await client.query('SELECT COUNT(*) FROM contacts WHERE owner_user_id = $1', [userId]);
      const need = Math.max(0, 16 - parseInt(existing.rows[0].count));
      for (let i = 0; i < need; i++) {
        const fn = firstNames[(userId * 7 + i) % firstNames.length];
        const ln = lastNames[(userId * 3 + i) % lastNames.length];
        const orgId = orgIds[(userId * 5 + i) % orgIds.length];
        await client.query(
          `INSERT INTO contacts (first_name, last_name, email, phone, organization_id, owner_user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() - interval '${Math.floor(Math.random() * 90)} days')`,
          [fn, ln, `${fn.toLowerCase()}.${ln.toLowerCase()}${userId}${i}@example.com`, `+1-555-${String(1000 + userId * 100 + i).slice(-4)}`, orgId, userId]
        );
        contactCount++;
      }
    }
    console.log(`Added ${contactCount} contacts`);

    // ============================================================
    // 3. ADD LEADS - referral leads per user + regular leads
    // ============================================================
    const leadNames = [
      'Cloud Migration Assessment', 'AI Integration Project', 'Digital Transformation',
      'CRM Implementation', 'Data Analytics Platform', 'Cybersecurity Audit',
      'ERP Modernization', 'Mobile App Development', 'IoT Sensor Network',
      'Blockchain Integration', 'Machine Learning Pipeline', 'DevOps Automation',
      'API Gateway Setup', 'Microservices Migration', 'Edge Computing Solution',
      'Smart Office Platform', 'Supply Chain Optimization', 'Customer 360 View',
      'Predictive Maintenance', 'Digital Twin Platform',
    ];
    const verticals = ['technology', 'finance', 'healthcare', 'manufacturing', 'retail', 'energy', 'government', 'education'];
    const needTypes = ['product', 'consulting', 'implementation', 'support', 'integration', 'training'];
    const statuses = ['new', 'qualified', 'contacted', 'converted', 'nurturing'];
    const geos = ['US', 'EU', 'UK', 'APAC', 'EMEA', 'LATAM'];

    let leadCount = 0;
    // For each user, ensure 16 referral leads (source_type='referral')
    for (let userId = 1; userId <= 7; userId++) {
      const existing = await client.query("SELECT COUNT(*) FROM leads WHERE source_owner_user_id = $1 AND source_type = 'referral'", [userId]);
      const need = Math.max(0, 16 - parseInt(existing.rows[0].count));
      for (let i = 0; i < need; i++) {
        const name = `${leadNames[(userId * 3 + i) % leadNames.length]} #${userId}-${i + 1}`;
        const orgId = orgIds[(userId * 4 + i) % orgIds.length];
        const conflictFlag = (i % 5 === 0); // every 5th has conflict
        await client.query(
          `INSERT INTO leads (lead_name, source_type, source_owner_user_id, sponsor_user_id, organization_id, geography, vertical, need_type, estimated_value, visibility_level, status, conflict_flag, created_at, updated_at)
           VALUES ($1, 'referral', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - interval '${Math.floor(Math.random() * 120)} days', NOW() - interval '${Math.floor(Math.random() * 30)} days')`,
          [
            name, userId, ((userId % 7) + 1), orgId,
            geos[i % geos.length], verticals[i % verticals.length], needTypes[i % needTypes.length],
            Math.floor(Math.random() * 500000) + 10000,
            ['internal', 'partner', 'public'][i % 3], statuses[i % statuses.length],
            conflictFlag,
          ]
        );
        leadCount++;
      }
    }
    // Also add some non-referral leads for full-access users
    for (let userId = 1; userId <= 3; userId++) {
      const existing = await client.query("SELECT COUNT(*) FROM leads WHERE source_owner_user_id = $1", [userId]);
      const totalNeed = Math.max(0, 16 - parseInt(existing.rows[0].count));
      for (let i = 0; i < totalNeed; i++) {
        const name = `Direct Lead ${userId}-${i + 1}`;
        await client.query(
          `INSERT INTO leads (lead_name, source_type, source_owner_user_id, organization_id, geography, vertical, need_type, estimated_value, visibility_level, status, conflict_flag, created_at, updated_at)
           VALUES ($1, 'direct', $2, $3, $4, $5, $6, $7, 'internal', $8, $9, NOW() - interval '${Math.floor(Math.random() * 90)} days', NOW())`,
          [
            name, userId, orgIds[(userId * 3 + i) % orgIds.length],
            geos[i % geos.length], verticals[i % verticals.length], needTypes[i % needTypes.length],
            Math.floor(Math.random() * 300000) + 5000, statuses[i % statuses.length],
            (i % 4 === 0),
          ]
        );
        leadCount++;
      }
    }
    console.log(`Added ${leadCount} leads`);

    // Add lead_assignments for partner users
    const allLeads = await client.query('SELECT id, source_owner_user_id FROM leads ORDER BY id');
    let assignCount = 0;
    for (let userId = 4; userId <= 7; userId++) {
      const existingAssigns = await client.query('SELECT COUNT(*) FROM lead_assignments WHERE assigned_user_id = $1', [userId]);
      const need = Math.max(0, 16 - parseInt(existingAssigns.rows[0].count));
      const otherLeads = allLeads.rows.filter(l => l.source_owner_user_id !== userId);
      for (let i = 0; i < need && i < otherLeads.length; i++) {
        try {
          await client.query(
            'INSERT INTO lead_assignments (lead_id, assigned_user_id, assignment_type, assigned_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
            [otherLeads[(userId * 3 + i) % otherLeads.length].id, userId, ['primary', 'secondary', 'support'][i % 3]]
          );
          assignCount++;
        } catch (e) { /* skip duplicates */ }
      }
    }
    console.log(`Added ${assignCount} lead assignments`);

    // ============================================================
    // 4. ADD OPPORTUNITIES - 16+ per user
    // ============================================================
    const oppNames = [
      'Enterprise CRM Rollout', 'AI-Powered Analytics', 'Cloud Infrastructure',
      'Digital Workplace Suite', 'Cybersecurity Platform', 'Data Lake Implementation',
      'Mobile Commerce App', 'IoT Fleet Management', 'Blockchain Supply Chain',
      'ML Fraud Detection', 'API Marketplace', 'Microservices Platform',
      'Edge AI Deployment', 'Smart Building System', 'Supply Chain Analytics',
      'Customer Data Platform', 'Predictive Quality', 'Digital Health Portal',
      'FinTech Integration', 'GovTech Platform',
    ];
    const dealTypes = ['new_business', 'expansion', 'renewal', 'upsell'];

    let oppCount = 0;
    for (let userId = 1; userId <= 7; userId++) {
      const existing = await client.query(
        `SELECT COUNT(*) FROM opportunities WHERE deal_owner_user_id = $1 OR source_owner_user_id = $1 OR sponsor_user_id = $1`,
        [userId]
      );
      const need = Math.max(0, 16 - parseInt(existing.rows[0].count));
      for (let i = 0; i < need; i++) {
        const name = `${oppNames[(userId * 4 + i) % oppNames.length]} - ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi'][i % 16]} ${userId}`;
        const orgId = orgIds[(userId * 2 + i) % orgIds.length];
        const stageId = (i % 6) + 1; // stages 1-6
        const conflictFlag = (i % 6 === 0);
        const totalValue = Math.floor(Math.random() * 900000) + 50000;
        const sourceOwner = userId;
        const dealOwner = userId;
        const sponsor = ((userId + i) % 7) + 1;

        await client.query(
          `INSERT INTO opportunities (opportunity_name, account_org_id, deal_owner_user_id, source_owner_user_id, sponsor_user_id, pipeline_id, stage_id, deal_type, estimated_total_value, recurring_value, one_time_value, expected_close_date, visibility_level, compliance_review_status, win_probability, conflict_flag, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW() - interval '${Math.floor(Math.random() * 150)} days', NOW() - interval '${Math.floor(Math.random() * 10)} days')`,
          [
            name, orgId, dealOwner, sourceOwner, sponsor,
            stageId, dealTypes[i % dealTypes.length],
            totalValue, Math.floor(totalValue * 0.6), Math.floor(totalValue * 0.4),
            new Date(Date.now() + (30 + i * 15) * 86400000).toISOString().split('T')[0],
            ['internal', 'partner', 'public'][i % 3],
            ['pending', 'approved', 'flagged'][i % 3],
            Math.floor(Math.random() * 80) + 10,
            conflictFlag,
            `Opportunity for ${orgNames[i % orgNames.length] || 'client'} engagement`,
          ]
        );
        oppCount++;
      }
    }
    console.log(`Added ${oppCount} opportunities`);

    // Add opportunity_roles for partner users to see more opps
    const allOpps = await client.query('SELECT id, deal_owner_user_id FROM opportunities ORDER BY id');
    let roleCount = 0;
    for (let userId = 4; userId <= 7; userId++) {
      const existingRoles = await client.query('SELECT opportunity_id FROM opportunity_roles WHERE user_id = $1', [userId]);
      const existingOppIds = new Set(existingRoles.rows.map(r => r.opportunity_id));
      const otherOpps = allOpps.rows.filter(o => o.deal_owner_user_id !== userId && !existingOppIds.has(o.id));
      const need = Math.max(0, 5); // add 5 extra opp roles per partner user
      for (let i = 0; i < need && i < otherOpps.length; i++) {
        try {
          await client.query(
            `INSERT INTO opportunity_roles (opportunity_id, user_id, role_in_opportunity, assigned_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
            [otherOpps[i].id, userId, ['technical_partner', 'delivery_manager', 'solution_architect', 'business_sponsor'][i % 4]]
          );
          roleCount++;
        } catch (e) { /* skip */ }
      }
    }
    console.log(`Added ${roleCount} opportunity roles`);

    // ============================================================
    // 5. ADD PROPOSALS linked to user opportunities
    // ============================================================
    const allOppsNow = await client.query('SELECT id, deal_owner_user_id, estimated_total_value FROM opportunities ORDER BY id');
    let proposalCount = 0;
    for (let userId = 1; userId <= 7; userId++) {
      const userOpps = allOppsNow.rows.filter(o => o.deal_owner_user_id === userId);
      // Each opp gets 1-2 proposals
      for (let j = 0; j < userOpps.length; j++) {
        const existing = await client.query('SELECT COUNT(*) FROM proposals WHERE opportunity_id = $1', [userOpps[j].id]);
        if (parseInt(existing.rows[0].count) > 0) continue;
        const val = parseInt(userOpps[j].estimated_total_value) || 100000;
        await client.query(
          `INSERT INTO proposals (opportunity_id, proposal_number, proposal_date, currency, one_time_amount, recurring_amount, implementation_amount, support_amount, discount_amount, approval_status, created_at)
           VALUES ($1, $2, NOW() - interval '${Math.floor(Math.random() * 60)} days', 'USD', $3, $4, $5, $6, $7, $8, NOW() - interval '${Math.floor(Math.random() * 60)} days')`,
          [
            userOpps[j].id,
            `PROP-${String(1000 + userOpps[j].id).slice(-4)}-${j + 1}`,
            Math.floor(val * 0.3), Math.floor(val * 0.5), Math.floor(val * 0.15),
            Math.floor(val * 0.05), Math.floor(val * 0.02),
            ['draft', 'submitted', 'approved', 'rejected'][j % 4],
          ]
        );
        proposalCount++;
      }
    }
    console.log(`Added ${proposalCount} proposals`);

    // ============================================================
    // 6. ADD REVENUE SHARES (payout-summary) - 16+ per partner user
    // ============================================================
    let revenueCount = 0;
    for (let userId = 4; userId <= 7; userId++) {
      const existing = await client.query('SELECT COUNT(*) FROM opportunity_revenue_shares WHERE beneficiary_user_id = $1', [userId]);
      const need = Math.max(0, 16 - parseInt(existing.rows[0].count));
      const userOpps2 = allOppsNow.rows;
      for (let i = 0; i < need; i++) {
        const opp = userOpps2[(userId * 3 + i) % userOpps2.length];
        const val = parseInt(opp.estimated_total_value) || 100000;
        const sharePercent = [5, 10, 15, 20, 25][i % 5];
        await client.query(
          `INSERT INTO opportunity_revenue_shares (opportunity_id, beneficiary_user_id, beneficiary_entity_id, share_type, share_percent, share_basis, calc_amount, payout_status, due_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            opp.id, userId,
            (i % 5) + 1, // partner entity 1-5
            ['referral_fee', 'commission', 'delivery_share', 'reseller_margin'][i % 4],
            sharePercent, ['total_value', 'recurring_value', 'one_time_value'][i % 3],
            Math.floor(val * sharePercent / 100),
            ['pending', 'approved', 'paid', 'scheduled'][i % 4],
            new Date(Date.now() + (i * 30) * 86400000).toISOString().split('T')[0],
            `Revenue share for partner contribution on ${opp.id}`,
          ]
        );
        revenueCount++;
      }
    }
    // Also ensure full-access users have some
    for (let userId = 1; userId <= 3; userId++) {
      const existing = await client.query('SELECT COUNT(*) FROM opportunity_revenue_shares WHERE beneficiary_user_id = $1', [userId]);
      const need = Math.max(0, 16 - parseInt(existing.rows[0].count));
      for (let i = 0; i < need; i++) {
        const opp = allOppsNow.rows[(userId * 5 + i) % allOppsNow.rows.length];
        const val = parseInt(opp.estimated_total_value) || 100000;
        await client.query(
          `INSERT INTO opportunity_revenue_shares (opportunity_id, beneficiary_user_id, share_type, share_percent, share_basis, calc_amount, payout_status, due_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            opp.id, userId,
            ['referral_fee', 'commission', 'delivery_share'][i % 3],
            [10, 15, 20][i % 3], 'total_value',
            Math.floor(val * 0.1),
            ['pending', 'approved', 'paid'][i % 3],
            new Date(Date.now() + (i * 30) * 86400000).toISOString().split('T')[0],
            `Revenue share for user ${userId}`,
          ]
        );
        revenueCount++;
      }
    }
    console.log(`Added ${revenueCount} revenue shares`);

    // ============================================================
    // 7. ADD ACTIVITIES - 16+ (non-private visible to partners)
    // ============================================================
    const activityTypes = ['call', 'email', 'meeting', 'note', 'task', 'demo', 'presentation'];
    const summaries = [
      'Follow-up call with client', 'Sent proposal via email', 'Product demo session',
      'Requirements gathering meeting', 'Technical architecture review', 'Contract negotiation',
      'Partnership discussion', 'Quarterly business review', 'Onboarding kickoff',
      'Security assessment review', 'Integration planning session', 'Budget approval meeting',
      'Stakeholder alignment call', 'Implementation timeline review', 'Customer success check-in',
      'Training session completed', 'Data migration planning', 'Go-live preparation meeting',
    ];

    let activityCount = 0;
    for (let userId = 1; userId <= 7; userId++) {
      const existing = await client.query('SELECT COUNT(*) FROM activities WHERE owner_user_id = $1', [userId]);
      const need = Math.max(0, 16 - parseInt(existing.rows[0].count));
      for (let i = 0; i < need; i++) {
        const relatedTypes = ['opportunity', 'lead', 'contact', 'organization'];
        await client.query(
          `INSERT INTO activities (related_type, related_id, activity_type, owner_user_id, activity_date, summary, next_step, private_flag, created_at)
           VALUES ($1, $2, $3, $4, NOW() - interval '${Math.floor(Math.random() * 60)} days', $5, $6, $7, NOW() - interval '${Math.floor(Math.random() * 60)} days')`,
          [
            relatedTypes[i % relatedTypes.length],
            (i % 10) + 1,
            activityTypes[i % activityTypes.length],
            userId,
            `${summaries[i % summaries.length]} - ${['Phase 1', 'Phase 2', 'Sprint Review', 'Planning'][i % 4]}`,
            `Schedule follow-up for ${['next week', 'next month', 'Q2', 'Q3'][i % 4]}`,
            false, // all non-private so partners can see
          ]
        );
        activityCount++;
      }
    }
    console.log(`Added ${activityCount} activities`);

    // ============================================================
    // 8. LINK OPPORTUNITIES TO DEAL PATHS
    // ============================================================
    const dealPaths = await client.query('SELECT id FROM deal_paths ORDER BY id');
    const finalOpps = await client.query('SELECT id FROM opportunities ORDER BY id');
    let pathLinkCount = 0;
    for (let i = 0; i < finalOpps.rows.length; i++) {
      const pathId = dealPaths.rows[i % dealPaths.rows.length].id;
      try {
        await client.query(
          'INSERT INTO opportunity_paths (opportunity_id, deal_path_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [finalOpps.rows[i].id, pathId]
        );
        pathLinkCount++;
      } catch (e) { /* skip duplicates */ }
    }
    console.log(`Added ${pathLinkCount} opportunity-path links`);

    // ============================================================
    // 9. SET PRODUCTS owner_user_id for partner users
    // ============================================================
    const products = await client.query('SELECT id FROM products ORDER BY id');
    let prodUpdateCount = 0;
    for (let userId = 4; userId <= 7; userId++) {
      const existing = await client.query('SELECT COUNT(*) FROM products WHERE owner_user_id = $1', [userId]);
      if (parseInt(existing.rows[0].count) < 16) {
        // Assign some products to this user
        const startIdx = (userId - 4) * 4;
        for (let i = startIdx; i < startIdx + 16 && i < products.rows.length; i++) {
          await client.query('UPDATE products SET owner_user_id = $1 WHERE id = $2 AND (owner_user_id IS NULL OR owner_user_id = 1)', [userId, products.rows[i].id]);
          prodUpdateCount++;
        }
      }
    }
    console.log(`Updated ${prodUpdateCount} product owners`);

    // ============================================================
    // 10. ADD MORE AGREEMENTS
    // ============================================================
    let agreementCount = 0;
    const existingAgreements = await client.query('SELECT COUNT(*) FROM agreements');
    const needAgreements = Math.max(0, 20 - parseInt(existingAgreements.rows[0].count));
    for (let i = 0; i < needAgreements; i++) {
      await client.query(
        `INSERT INTO agreements (agreement_type, related_type, related_id, party_1, party_2, start_date, end_date, status, governing_law, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          ['nda', 'msa', 'sow', 'partnership', 'reseller', 'licensing'][i % 6],
          ['opportunity', 'partner_entity'][i % 2],
          (i % 10) + 1,
          'Alliance Ecosystem',
          orgNames[i % orgNames.length],
          new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
          new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          ['draft', 'active', 'pending_review', 'signed', 'expired'][i % 5],
          ['US', 'EU', 'UK', 'Turkish'][i % 4],
          `Agreement for ${orgNames[i % orgNames.length]} partnership`,
        ]
      );
      agreementCount++;
    }
    console.log(`Added ${agreementCount} agreements`);

    // ============================================================
    // 11. ENSURE ENOUGH CONFLICT-FLAGGED ITEMS (for conflict queue)
    // ============================================================
    const conflictLeads = await client.query('SELECT COUNT(*) FROM leads WHERE conflict_flag = true');
    const conflictOpps = await client.query('SELECT COUNT(*) FROM opportunities WHERE conflict_flag = true');
    const totalConflicts = parseInt(conflictLeads.rows[0].count) + parseInt(conflictOpps.rows[0].count);
    console.log(`Total conflict items: ${totalConflicts} (leads: ${conflictLeads.rows[0].count}, opps: ${conflictOpps.rows[0].count})`);

    // If still under 16, flag more
    if (totalConflicts < 16) {
      const toFlag = 16 - totalConflicts;
      await client.query(`UPDATE leads SET conflict_flag = true WHERE id IN (SELECT id FROM leads WHERE conflict_flag = false ORDER BY id LIMIT ${Math.ceil(toFlag / 2)})`);
      await client.query(`UPDATE opportunities SET conflict_flag = true WHERE id IN (SELECT id FROM opportunities WHERE conflict_flag = false ORDER BY id LIMIT ${Math.ceil(toFlag / 2)})`);
      console.log(`Flagged ${toFlag} more items for conflict queue`);
    }

    // ============================================================
    // 12. ADD MORE ORGANIZATIONS owned by each user to reach 16+
    // ============================================================
    for (let userId = 1; userId <= 7; userId++) {
      const existing = await client.query('SELECT COUNT(*) FROM organizations WHERE owner_user_id = $1', [userId]);
      const need = Math.max(0, 16 - parseInt(existing.rows[0].count));
      for (let i = 0; i < need; i++) {
        const name = `${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi'][i % 16]} ${['Corp', 'Inc', 'Ltd', 'GmbH', 'SA'][i % 5]} U${userId}`;
        await client.query(
          `INSERT INTO organizations (org_name, owner_user_id, org_type, country, created_at) VALUES ($1, $2, $3, $4, NOW() - interval '${Math.floor(Math.random() * 120)} days')`,
          [name, userId, ['customer', 'partner', 'prospect'][i % 3], ['USA', 'Germany', 'UK', 'Turkey'][i % 4]]
        );
      }
      if (need > 0) console.log(`Added ${need} orgs for user ${userId}`);
    }

    // ============================================================
    // 13. NOTIFICATIONS - 15+ per user
    // ============================================================
    const notifTypes = ['system', 'opportunity', 'lead', 'governance', 'compliance', 'project', 'product', 'risk'];
    const notifTemplates = [
      { type: 'opportunity', title: 'Deal stage updated', message: 'A deal has moved to the next pipeline stage.' },
      { type: 'opportunity', title: 'New opportunity created', message: 'A new opportunity has been added to the pipeline.' },
      { type: 'opportunity', title: 'Revenue share confirmed', message: 'Your revenue share allocation has been confirmed.' },
      { type: 'opportunity', title: 'Deal closing soon', message: 'An opportunity is expected to close this week.' },
      { type: 'opportunity', title: 'Proposal submitted', message: 'A new proposal has been submitted for review.' },
      { type: 'lead', title: 'New lead assigned', message: 'A new lead has been assigned to you for follow-up.' },
      { type: 'lead', title: 'Lead status changed', message: 'A lead you are tracking has changed status.' },
      { type: 'lead', title: 'Referral received', message: 'A new referral lead has been submitted.' },
      { type: 'governance', title: 'Visibility request pending', message: 'A visibility upgrade request needs your review.' },
      { type: 'governance', title: 'Access request approved', message: 'Your access request has been approved.' },
      { type: 'compliance', title: 'Compliance review required', message: 'A deal requires compliance review before proceeding.' },
      { type: 'project', title: 'Project milestone due', message: 'A project milestone is approaching its deadline.' },
      { type: 'project', title: 'Budget alert', message: 'A project is approaching its budget limit.' },
      { type: 'system', title: 'Weekly digest available', message: 'Your weekly pipeline summary is ready to view.' },
      { type: 'system', title: 'Welcome to Alliance CRM', message: 'Your workspace is ready. Start by reviewing the dashboard.' },
      { type: 'product', title: 'Product update available', message: 'A product in your portfolio has been updated.' },
      { type: 'risk', title: 'Risk flagged', message: 'A new risk has been identified on one of your deals.' },
      { type: 'system', title: 'New team member joined', message: 'A new member has joined the alliance.' },
    ];

    let notifCount = 0;
    for (let userId = 1; userId <= 8; userId++) {
      const existing = await client.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]);
      const need = Math.max(0, 18 - parseInt(existing.rows[0].count));
      for (let i = 0; i < need; i++) {
        const tmpl = notifTemplates[i % notifTemplates.length];
        const hoursAgo = Math.floor(Math.random() * 168) + 1; // within past 7 days
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, read, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW() - interval '${hoursAgo} hours')`,
          [userId, tmpl.type, tmpl.title, tmpl.message, (i < 5)] // first 5 are read, rest unread
        );
        notifCount++;
      }
    }
    console.log(`Added ${notifCount} notifications`);

    await client.query('COMMIT');
    console.log('\n=== SEED COMPLETE ===');

    // Verify final counts
    console.log('\n=== FINAL VERIFICATION ===');
    for (const table of ['leads', 'opportunities', 'projects', 'partner_entities', 'agreements', 'proposals', 'risks', 'products', 'activities', 'contacts', 'organizations', 'shared_items', 'visibility_requests', 'compliance_reviews', 'opportunity_revenue_shares']) {
      const r = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${r.rows[0].count}`);
    }

    // Per-user counts for key filtered tables
    console.log('\n=== PER-USER COUNTS ===');
    for (let userId = 1; userId <= 8; userId++) {
      const user = (await client.query('SELECT full_name, role FROM users WHERE id = $1', [userId])).rows[0];
      const leads = await client.query("SELECT COUNT(*) FROM leads WHERE source_owner_user_id = $1", [userId]);
      const referrals = await client.query("SELECT COUNT(*) FROM leads WHERE source_owner_user_id = $1 AND source_type = 'referral'", [userId]);
      const opps = await client.query("SELECT COUNT(*) FROM opportunities WHERE deal_owner_user_id = $1 OR source_owner_user_id = $1 OR sponsor_user_id = $1", [userId]);
      const contacts = await client.query("SELECT COUNT(*) FROM contacts WHERE owner_user_id = $1", [userId]);
      const orgs = await client.query("SELECT COUNT(*) FROM organizations WHERE owner_user_id = $1", [userId]);
      const activities = await client.query("SELECT COUNT(*) FROM activities WHERE owner_user_id = $1", [userId]);
      const projects = await client.query("SELECT COUNT(*) FROM projects WHERE project_owner_user_id = $1 OR delivery_manager_user_id = $1 OR technical_lead_user_id = $1", [userId]);
      const risks = await client.query("SELECT COUNT(*) FROM risks WHERE owner_user_id = $1", [userId]);
      const products = await client.query("SELECT COUNT(*) FROM products WHERE owner_user_id = $1", [userId]);
      const payouts = await client.query("SELECT COUNT(*) FROM opportunity_revenue_shares WHERE beneficiary_user_id = $1", [userId]);
      console.log(`\nUser ${userId} (${user.full_name} - ${user.role}):`);
      console.log(`  leads=${leads.rows[0].count} referrals=${referrals.rows[0].count} opps=${opps.rows[0].count} contacts=${contacts.rows[0].count} orgs=${orgs.rows[0].count}`);
      console.log(`  activities=${activities.rows[0].count} projects=${projects.rows[0].count} risks=${risks.rows[0].count} products=${products.rows[0].count} payouts=${payouts.rows[0].count}`);
    }

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e);
    throw e;
  } finally {
    client.release();
    pool.end();
  }
}

seed();
