const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { isFullAccess, isRestricted, isPartnerRole, canAccessRecord,
  opportunityFilter, leadFilter, projectFilter, riskFilter } = require('../middleware/dataFilter');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;

const SYSTEM_PROMPT = `You are an AI assistant for Alliance CRM, a sophisticated partner ecosystem and deal management platform.

Alliance CRM manages:
- Organizations (clients, partners, prospects) across Europe, Middle East, and beyond
- Contacts with relationship strength tracking and consent management
- Partner entities with billing capabilities and revenue sharing
- Products/solutions (SaaS, consulting, hardware) with maturity levels
- Leads with source tracking, protection periods, and conflict detection
- Multi-pipeline opportunities (Direct Sales, Channel/Referral, Partnership, Government)
- Proposals with multi-currency support and approval workflows
- Projects with milestones, delivery managers, and technical leads
- Agreements (NDA, MSA, SOW, DPA) with governing law tracking
- Risk management across deals, projects, and compliance
- KPI contributions tracking individual and team performance
- Revenue sharing and deal path management

The alliance has 6 key personas:
1. Erol Akarsu - Super Admin / Founding Orchestrator
2. Ayse Yilmaz - Partner Owner / Business Builder
3. Mehmet Demir - Solution Architect / Technical Partner
4. Fatma Kaya - Channel / Referral Partner
5. Ali Ozturk - Delivery Manager / PMO
6. Zeynep Aksoy - Restricted External / Advisor

Provide concise, actionable insights. Use data-driven recommendations when possible.`;

async function callOpenRouter(messages) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Alliance CRM',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// POST /api/ai/analyze
router.post('/analyze', auth, async (req, res) => {
  try {
    const { prompt, context, feature } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let contextualSystemPrompt = SYSTEM_PROMPT;

    if (feature) {
      const featureContexts = {
        dashboard: '\n\nThe user is viewing the dashboard. Help analyze overall CRM performance, trends, and key metrics.',
        leads: '\n\nThe user is analyzing leads. Help with lead scoring, qualification, conversion strategies, lead source performance, and protection period tracking. Provide specific, data-driven answers.',
        opportunities: '\n\nThe user is analyzing opportunities. Help with deal strategy, pipeline analysis, win probability assessment, stage progression, and revenue forecasting. Provide specific, data-driven answers.',
        risks: '\n\nThe user is analyzing risks. Help assess risk severity, suggest mitigation strategies, prioritize actions, and track compliance risks. Provide specific, data-driven answers.',
        projects: '\n\nThe user is analyzing projects. Help with project status assessment, timeline analysis, milestone tracking, resource planning, delivery health, and identifying at-risk projects. Provide specific, data-driven answers.',
        proposals: '\n\nThe user is working on proposals. Help with pricing strategy, competitive positioning, and proposal optimization.',
        contacts: '\n\nThe user is analyzing contacts. Help with relationship strength analysis, engagement tracking, consent management, contact prioritization, and key decision-maker identification. Provide specific, data-driven answers.',
        kpi: '\n\nThe user is reviewing KPIs. Help analyze performance metrics, identify trends, and suggest improvements.',
        products: '\n\nThe user is analyzing products and solutions. Help with product performance analysis, maturity assessment, pricing strategy, product bundling, and revenue contribution by product. Provide specific, data-driven answers.',
        partners: '\n\nThe user is analyzing partners. Help with partner performance evaluation, revenue sharing analysis, channel vs referral effectiveness, partner engagement, and co-selling recommendations. Provide specific, data-driven answers.',
        pipeline: '\n\nThe user is analyzing the sales pipeline. Help with pipeline health assessment, stage conversion rates, velocity metrics, bottleneck identification, pipeline coverage, and revenue forecasting. Provide specific, data-driven answers.',
        general: '\n\nThe user is asking a general question about the CRM. Provide a comprehensive, executive-level answer covering the relevant areas. Provide specific, data-driven answers.',
      };
      contextualSystemPrompt += featureContexts[feature] || '';
    }

    // C2: Block restricted_external from sensitive features
    const role = req.user.role;
    const userId = req.user.id;
    if (isRestricted(role)) {
      const allowedFeatures = ['products', 'general'];
      if (feature && !allowedFeatures.includes(feature)) {
        return res.status(403).json({ error: 'Your role does not have access to analyze this data' });
      }
    }

    // Fetch real data from database based on feature, with role-based filtering
    let dbContext = null;
    try {
      // C2: Build role-filtered queries for each feature
      const buildFilteredQuery = (feature) => {
        if (isFullAccess(role)) {
          // Full access: no filtering needed, use original queries
          const fullQueries = {
            contacts: `SELECT COUNT(*) as total,
              COUNT(CASE WHEN relationship_strength >= 7 THEN 1 END) as strong_relationships,
              COUNT(CASE WHEN relationship_strength <= 3 THEN 1 END) as weak_relationships,
              COUNT(CASE WHEN consent_status = 'given' THEN 1 END) as consent_given,
              COUNT(CASE WHEN consent_status = 'expired' OR consent_status IS NULL THEN 1 END) as consent_missing
              FROM contacts`,
            leads: `SELECT COUNT(*) as total,
              COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
              COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
              COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
              COUNT(CASE WHEN status = 'lost' OR status = 'disqualified' THEN 1 END) as lost,
              COUNT(CASE WHEN updated_at < NOW() - INTERVAL '14 days' AND status NOT IN ('converted', 'lost', 'disqualified') THEN 1 END) as idle_leads
              FROM leads`,
            opportunities: `SELECT COUNT(*) as total,
              COALESCE(SUM(deal_value), 0) as total_pipeline_value,
              COUNT(CASE WHEN status = 'open' THEN 1 END) as open_deals,
              COUNT(CASE WHEN status = 'won' THEN 1 END) as won_deals,
              COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_deals,
              COALESCE(AVG(deal_value), 0) as avg_deal_value
              FROM opportunities`,
            products: `SELECT COUNT(*) as total,
              COUNT(CASE WHEN product_type = 'SaaS' THEN 1 END) as saas_count,
              COUNT(CASE WHEN product_type = 'Consulting' THEN 1 END) as consulting_count,
              COUNT(CASE WHEN product_type = 'Hardware' THEN 1 END) as hardware_count,
              COUNT(CASE WHEN maturity_level = 'mature' THEN 1 END) as mature_products,
              COUNT(CASE WHEN is_active = true THEN 1 END) as active_products
              FROM products`,
            projects: `SELECT COUNT(*) as total,
              COUNT(CASE WHEN status = 'active' OR status = 'in_progress' THEN 1 END) as active_projects,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
              COUNT(CASE WHEN status = 'at_risk' OR status = 'delayed' THEN 1 END) as at_risk,
              COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold
              FROM projects`,
            partners: `SELECT COUNT(*) as total,
              COUNT(CASE WHEN partner_type = 'channel' THEN 1 END) as channel_partners,
              COUNT(CASE WHEN partner_type = 'referral' THEN 1 END) as referral_partners,
              COUNT(CASE WHEN is_active = true OR status = 'active' THEN 1 END) as active_partners
              FROM partners`,
            risks: `SELECT COUNT(*) as total,
              COUNT(CASE WHEN severity = 'critical' OR severity = 'high' THEN 1 END) as high_severity,
              COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
              COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity,
              COUNT(CASE WHEN status = 'open' OR status = 'active' THEN 1 END) as open_risks,
              COUNT(CASE WHEN status = 'mitigated' OR status = 'resolved' THEN 1 END) as resolved_risks
              FROM risks`,
            pipeline: `SELECT p.pipeline_name, COUNT(o.id) as deal_count, COALESCE(SUM(o.deal_value), 0) as total_value
              FROM pipelines p
              LEFT JOIN opportunities o ON o.pipeline_id = p.id
              GROUP BY p.id, p.pipeline_name`,
          };
          return fullQueries[feature] ? { query: fullQueries[feature], params: [] } : null;
        }

        // Role-filtered queries for non-full-access users
        const { leadFilter: lf, opportunityFilter: of, projectFilter: pf, riskFilter: rf, productFilter: prodf } = require('../middleware/dataFilter');
        switch (feature) {
          case 'leads': {
            const f = lf(role, userId, 1);
            return {
              query: `SELECT COUNT(*) as total,
                COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads,
                COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified,
                COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted,
                COUNT(CASE WHEN l.status = 'lost' OR l.status = 'disqualified' THEN 1 END) as lost
                FROM leads l WHERE 1=1${f.clause}`,
              params: f.params
            };
          }
          case 'opportunities': {
            const f = of(role, userId, 1);
            return {
              query: `SELECT COUNT(*) as total,
                COALESCE(SUM(op.deal_value), 0) as total_pipeline_value,
                COUNT(CASE WHEN op.status = 'open' THEN 1 END) as open_deals,
                COUNT(CASE WHEN op.status = 'won' THEN 1 END) as won_deals,
                COUNT(CASE WHEN op.status = 'lost' THEN 1 END) as lost_deals
                FROM opportunities op WHERE 1=1${f.clause}`,
              params: f.params
            };
          }
          case 'projects': {
            const f = pf(role, userId, 1);
            return {
              query: `SELECT COUNT(*) as total,
                COUNT(CASE WHEN pj.status = 'active' OR pj.status = 'in_progress' THEN 1 END) as active_projects,
                COUNT(CASE WHEN pj.status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN pj.status = 'at_risk' OR pj.status = 'delayed' THEN 1 END) as at_risk
                FROM projects pj WHERE 1=1${f.clause}`,
              params: f.params
            };
          }
          case 'risks': {
            const f = rf(role, userId, 1);
            return {
              query: `SELECT COUNT(*) as total,
                COUNT(CASE WHEN r.severity = 'critical' OR r.severity = 'high' THEN 1 END) as high_severity,
                COUNT(CASE WHEN r.severity = 'medium' THEN 1 END) as medium_severity,
                COUNT(CASE WHEN r.status = 'open' OR r.status = 'active' THEN 1 END) as open_risks
                FROM risks r WHERE 1=1${f.clause}`,
              params: f.params
            };
          }
          case 'products': {
            const f = prodf(role, userId, 1);
            return {
              query: `SELECT COUNT(*) as total,
                COUNT(CASE WHEN p.maturity_level = 'mature' THEN 1 END) as mature_products
                FROM products p WHERE 1=1${f.clause}`,
              params: f.params
            };
          }
          case 'contacts': {
            // PMO/SA see all; partners see own
            if (role === 'pmo_coordinator' || role === 'solution_architect') {
              return {
                query: `SELECT COUNT(*) as total,
                  COUNT(CASE WHEN consent_status = 'given' THEN 1 END) as consent_given
                  FROM contacts`,
                params: []
              };
            }
            return {
              query: `SELECT COUNT(*) as total,
                COUNT(CASE WHEN consent_status = 'given' THEN 1 END) as consent_given
                FROM contacts WHERE owner_user_id = $1 OR id IN (SELECT contact_id FROM relationship_links WHERE known_by_user_id = $1)`,
              params: [userId]
            };
          }
          case 'pipeline': {
            const f = of(role, userId, 1);
            return {
              query: `SELECT p.pipeline_name, COUNT(op.id) as deal_count, COALESCE(SUM(op.deal_value), 0) as total_value
                FROM pipelines p
                LEFT JOIN opportunities op ON op.pipeline_id = p.id AND (1=1${f.clause})
                GROUP BY p.id, p.pipeline_name`,
              params: f.params
            };
          }
          default:
            return null;
        }
      };

      const filteredQuery = buildFilteredQuery(feature);
      if (filteredQuery) {
        const result = await pool.query(filteredQuery.query, filteredQuery.params);
        dbContext = feature === 'pipeline' ? result.rows : result.rows[0];
      }
    } catch (dbErr) {
      console.log('DB context fetch skipped:', dbErr.message);
    }

    const messages = [
      { role: 'system', content: contextualSystemPrompt },
    ];

    if (dbContext) {
      messages.push({ role: 'user', content: `Here is the current data from the database for context:\n${JSON.stringify(dbContext, null, 2)}\n\nBased on this real data, answer the following question directly and specifically. Do not ask clarifying questions - use the data provided.` });
    }

    if (context) {
      messages.push({ role: 'user', content: `Additional context: ${JSON.stringify(context)}` });
    }

    messages.push({ role: 'user', content: prompt });

    const aiResponse = await callOpenRouter(messages);

    res.json({ response: aiResponse, model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: 'AI analysis failed', message: err.message });
  }
});

// POST /api/ai/suggest
router.post('/suggest', auth, async (req, res) => {
  try {
    const { entity_type, entity_id, action } = req.body;

    if (!entity_type) {
      return res.status(400).json({ error: 'Entity type is required' });
    }

    // C2: Block restricted_external from suggest endpoint
    if (isRestricted(req.user.role)) {
      return res.status(403).json({ error: 'Your role does not have access to AI suggestions' });
    }

    let entityData = null;
    let contextPrompt = '';

    // C2: Access check mapping for entity types
    const accessChecks = {
      opportunity: { table: 'opportunities', alias: 'op', filterFn: opportunityFilter },
      lead: { table: 'leads', alias: 'l', filterFn: leadFilter },
      project: { table: 'projects', alias: 'pj', filterFn: projectFilter },
      risk: { table: 'risks', alias: 'r', filterFn: riskFilter },
    };

    // C2: Verify user can access the entity before fetching data for AI
    if (entity_id && accessChecks[entity_type]) {
      const check = accessChecks[entity_type];
      const hasAccess = await canAccessRecord(pool, check.table, check.alias, check.filterFn, entity_id, req.user.role, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: `Access denied to this ${entity_type}` });
      }
    }

    switch (entity_type) {
      case 'opportunity': {
        const result = await pool.query(
          `SELECT o.*, org.org_name, s.stage_name, p.pipeline_name, u.full_name AS deal_owner_name
           FROM opportunities o
           LEFT JOIN organizations org ON o.account_org_id = org.id
           LEFT JOIN stages s ON o.stage_id = s.id
           LEFT JOIN pipelines p ON o.pipeline_id = p.id
           LEFT JOIN users u ON o.deal_owner_user_id = u.id
           WHERE o.id = $1`,
          [entity_id]
        );
        entityData = result.rows[0];
        contextPrompt = `Analyze this opportunity and provide suggestions for advancing it: ${JSON.stringify(entityData)}`;
        break;
      }
      case 'lead': {
        const result = await pool.query(
          `SELECT l.*, o.org_name, u.full_name AS source_owner_name
           FROM leads l
           LEFT JOIN organizations o ON l.organization_id = o.id
           LEFT JOIN users u ON l.source_owner_user_id = u.id
           WHERE l.id = $1`,
          [entity_id]
        );
        entityData = result.rows[0];
        contextPrompt = `Analyze this lead and suggest next steps for qualification and conversion: ${JSON.stringify(entityData)}`;
        break;
      }
      case 'project': {
        const result = await pool.query(
          `SELECT pj.*, u.full_name AS owner_name, dm.full_name AS delivery_manager_name
           FROM projects pj
           LEFT JOIN users u ON pj.project_owner_user_id = u.id
           LEFT JOIN users dm ON pj.delivery_manager_user_id = dm.id
           WHERE pj.id = $1`,
          [entity_id]
        );
        entityData = result.rows[0];

        const milestones = await pool.query(
          'SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY due_date',
          [entity_id]
        );
        entityData.milestones = milestones.rows;
        contextPrompt = `Analyze this project status and milestones, suggest improvements: ${JSON.stringify(entityData)}`;
        break;
      }
      case 'risk': {
        const result = await pool.query(
          `SELECT r.*, u.full_name AS owner_name FROM risks r
           LEFT JOIN users u ON r.owner_user_id = u.id WHERE r.id = $1`,
          [entity_id]
        );
        entityData = result.rows[0];
        contextPrompt = `Analyze this risk and suggest mitigation strategies: ${JSON.stringify(entityData)}`;
        break;
      }
      default:
        contextPrompt = action || `Provide general suggestions for managing ${entity_type} entities in the Alliance CRM.`;
    }

    if (!entityData && entity_id) {
      return res.status(404).json({ error: `${entity_type} not found` });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\nProvide 3-5 specific, actionable suggestions. Format as numbered list.' },
      { role: 'user', content: contextPrompt },
    ];

    const aiResponse = await callOpenRouter(messages);

    res.json({ suggestions: aiResponse, entity_type, entity_id, model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI suggest error:', err);
    res.status(500).json({ error: 'AI suggestion failed', message: err.message });
  }
});

module.exports = router;
