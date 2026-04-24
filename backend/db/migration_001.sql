-- Migration: Add missing opportunity columns and seed deal_paths
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS technical_partner_user_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS product_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS delivery_owner_user_id INT REFERENCES users(id) ON DELETE SET NULL;

-- Seed deal paths (from document Section 7)
INSERT INTO deal_paths (path_name, description) VALUES
  ('referral', 'Partner refers client, alliance handles delivery'),
  ('co-sell', 'Joint selling with shared responsibilities'),
  ('reseller', 'Partner resells alliance products/services'),
  ('implementation', 'Alliance implements partner product at client'),
  ('advisory', 'Strategic advisory and consulting engagement')
ON CONFLICT DO NOTHING;
