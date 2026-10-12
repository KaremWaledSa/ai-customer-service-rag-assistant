require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const migrations = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (doctors)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'doctor',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations (one per WhatsApp number)
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    client_phone VARCHAR(20) UNIQUE NOT NULL,
    client_name VARCHAR(100),
    last_message_at TIMESTAMP,
    total_messages INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'audio', 'document')),

    -- WhatsApp metadata
    whatsapp_message_id VARCHAR(100),

    -- AI/RAG data
    ai_response TEXT,
    approved_response TEXT,
    rag_examples JSONB,
    similarity_score DECIMAL(4,3),

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'approved', 'rejected', 'sent', 'failed')),
    approved_at TIMESTAMP,
    sent_at TIMESTAMP,

    -- Timestamps
    received_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Base with Vector Embeddings
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    client_message TEXT NOT NULL,
    doctor_response TEXT NOT NULL,
    category VARCHAR(50),
    embedding vector(1536),
    source VARCHAR(20) DEFAULT 'learned' CHECK (source IN ('initial', 'uploaded', 'learned')),

    -- Metadata
    message_id INT REFERENCES messages(id) ON DELETE SET NULL,
    times_retrieved INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast vector search (IVFFlat)
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Images table for OCR/Vision
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    message_id INT REFERENCES messages(id) ON DELETE CASCADE,

    -- Storage
    file_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    original_filename VARCHAR(255),
    mime_type VARCHAR(50),
    file_size INT,
    whatsapp_media_id VARCHAR(100),

    -- Analysis results
    image_type VARCHAR(50) CHECK (image_type IN ('food', 'handwriting', 'scale', 'general', 'unknown')),
    analysis_result JSONB,
    extracted_text TEXT,
    food_items JSONB,
    scale_reading DECIMAL(10,2),

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMP,
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- API Usage tracking for cost monitoring
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,

    -- OpenAI usage (tokens)
    embeddings_tokens INT DEFAULT 0,
    chat_tokens_input INT DEFAULT 0,
    chat_tokens_output INT DEFAULT 0,
    vision_tokens INT DEFAULT 0,

    -- Costs (USD)
    embeddings_cost DECIMAL(10,4) DEFAULT 0,
    chat_cost DECIMAL(10,4) DEFAULT 0,
    vision_cost DECIMAL(10,4) DEFAULT 0,

    -- WhatsApp usage
    whatsapp_conversations INT DEFAULT 0,
    whatsapp_cost DECIMAL(10,4) DEFAULT 0,

    -- Message counts
    messages_received INT DEFAULT 0,
    messages_sent INT DEFAULT 0,
    images_processed INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_status_idx ON messages(status);
CREATE INDEX IF NOT EXISTS messages_received_at_idx ON messages(received_at DESC);
CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_base_category_idx ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS images_message_idx ON images(message_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function runMigrations() {
  console.log('🚀 Running database migrations...');

  try {
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully!');

    // Check tables created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tables created:');
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations();
