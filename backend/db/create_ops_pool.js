const pool = require('./connection');
async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ops_pool (
      id SERIAL PRIMARY KEY,
      opportunity_id INTEGER REFERENCES opportunities(id),
      pool_percent DECIMAL(5,2) DEFAULT 5.00,
      pool_amount DECIMAL(12,2),
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS revenue_share_templates (
      id SERIAL PRIMARY KEY,
      template_name VARCHAR(100) NOT NULL,
      deal_path_type VARCHAR(50),
      shares JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO revenue_share_templates (template_name, deal_path_type, shares) VALUES
    ('Referral Standard', 'referral', '[{"role":"source_owner","percent":10},{"role":"deal_owner","percent":15},{"role":"ops_pool","percent":5}]'),
    ('Co-Sell Standard', 'co_sell', '[{"role":"source_owner","percent":15},{"role":"deal_owner","percent":20},{"role":"technical_partner","percent":10},{"role":"ops_pool","percent":5}]'),
    ('Reseller Standard', 'reseller', '[{"role":"deal_owner","percent":25},{"role":"product_owner","percent":15},{"role":"ops_pool","percent":5}]'),
    ('Implementation', 'implementation', '[{"role":"delivery_owner","percent":20},{"role":"technical_partner","percent":15},{"role":"deal_owner","percent":10},{"role":"ops_pool","percent":5}]')
    ON CONFLICT DO NOTHING;
  `);

  console.log('ops_pool and revenue_share_templates tables created');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
