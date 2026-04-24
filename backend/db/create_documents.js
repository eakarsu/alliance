const pool = require('./connection');
async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      document_url TEXT,
      document_type VARCHAR(50),
      related_type VARCHAR(50),
      related_id INTEGER,
      uploaded_by_user_id INTEGER REFERENCES users(id),
      visibility_level VARCHAR(20) DEFAULT 'internal',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_type, related_id);
  `);
  console.log('documents table created');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
