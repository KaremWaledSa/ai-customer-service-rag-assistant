/**
 * RAG System Test Script
 * Tests the core RAG functionality
 * Run: node test/test-rag.js
 *
 * Prerequisites:
 * - PostgreSQL running with pgvector
 * - Database migrated and seeded
 * - OpenAI API key in .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testRAG() {
  console.log('🧪 Testing RAG System\n');
  console.log('=' .repeat(50));

  // Check database connection
  console.log('\n📍 Test 1: Database Connection');
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    client.release();
  } catch (e) {
    console.log('❌ Database connection failed:', e.message);
    console.log('\n⚠️  Make sure PostgreSQL is running');
    return;
  }

  // Check pgvector extension
  console.log('\n📍 Test 2: pgvector Extension');
  try {
    const result = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    if (result.rows.length > 0) {
      console.log('✅ pgvector extension installed');
    } else {
      console.log('❌ pgvector extension not found');
      console.log('   Run: CREATE EXTENSION vector;');
    }
  } catch (e) {
    console.log('❌ Check failed:', e.message);
  }

  // Check knowledge base
  console.log('\n📍 Test 3: Knowledge Base');
  try {
    const result = await pool.query('SELECT COUNT(*) FROM knowledge_base');
    const count = parseInt(result.rows[0].count);
    console.log('✅ Knowledge base entries:', count);

    if (count === 0) {
      console.log('   ⚠️  Run: npm run seed');
    }
  } catch (e) {
    console.log('❌ Query failed:', e.message);
    console.log('   ⚠️  Run: npm run migrate');
    return;
  }

  // Check embeddings
  console.log('\n📍 Test 4: Embeddings');
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL'
    );
    const count = parseInt(result.rows[0].count);
    console.log('✅ Entries with embeddings:', count);

    if (count === 0) {
      console.log('   ⚠️  No embeddings found. Check OpenAI API key.');
    }
  } catch (e) {
    console.log('❌ Query failed:', e.message);
  }

  // Test vector search
  console.log('\n📍 Test 5: Vector Search (if embeddings exist)');
  try {
    const result = await pool.query(`
      SELECT
        client_message,
        doctor_response,
        category
      FROM knowledge_base
      WHERE embedding IS NOT NULL
      LIMIT 3
    `);

    if (result.rows.length > 0) {
      console.log('✅ Sample entries:');
      result.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. "${row.client_message.substring(0, 40)}..."`);
        console.log(`      Category: ${row.category}`);
      });
    }
  } catch (e) {
    console.log('❌ Query failed:', e.message);
  }

  // Check OpenAI API key
  console.log('\n📍 Test 6: OpenAI API Key');
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.log('✅ OpenAI API key configured');
  } else {
    console.log('❌ OpenAI API key not configured');
    console.log('   Add OPENAI_API_KEY to .env file');
  }

  // Check users table
  console.log('\n📍 Test 7: Users Table');
  try {
    const result = await pool.query('SELECT email, name FROM users LIMIT 1');
    if (result.rows.length > 0) {
      console.log('✅ Default user exists:', result.rows[0].email);
    } else {
      console.log('⚠️  No users found. Run: npm run seed');
    }
  } catch (e) {
    console.log('❌ Query failed:', e.message);
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 RAG System Tests Completed!\n');

  await pool.end();
}

testRAG().catch(console.error);
