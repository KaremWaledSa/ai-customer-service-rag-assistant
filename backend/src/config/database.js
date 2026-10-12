const { Pool } = require('pg');

let pool;

const initDatabase = async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Test connection
  const client = await pool.connect();

  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector extension enabled');
  } catch (err) {
    console.warn('⚠️ Could not enable pgvector (may already exist):', err.message);
  } finally {
    client.release();
  }

  return pool;
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
};

const query = async (text, params) => {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Query executed:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
};

module.exports = {
  initDatabase,
  getPool,
  query
};
