BEGIN;
ALTER TABLE alliance_memberships ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE alliance_memberships ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE alliance_memberships ADD COLUMN IF NOT EXISTS display_name TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS alliance_membership_email_idx ON alliance_memberships(LOWER(email)) WHERE email IS NOT NULL;
COMMIT;
