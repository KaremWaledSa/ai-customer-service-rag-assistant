# 🗄️ Database - PostgreSQL + pgvector

## الحالة: 🔲 قادم في المرحلة 2

---

## Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- جدول المحادثات
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    client_phone VARCHAR(20),
    client_message TEXT NOT NULL,
    ai_response TEXT,
    approved_response TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP
);

-- جدول قاعدة المعرفة مع Vector
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    client_message TEXT NOT NULL,
    doctor_response TEXT NOT NULL,
    category VARCHAR(50),
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    source VARCHAR(20) DEFAULT 'initial', -- initial, uploaded, learned
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index للبحث السريع (IVFFlat)
CREATE INDEX ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- جدول الإعدادات
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Views مفيدة
CREATE VIEW pending_messages AS
SELECT * FROM conversations WHERE status = 'pending' ORDER BY created_at DESC;

CREATE VIEW knowledge_stats AS
SELECT 
    source,
    COUNT(*) as count,
    MAX(created_at) as last_added
FROM knowledge_base
GROUP BY source;
```

---

## Indexes

```sql
-- للبحث بالحالة
CREATE INDEX idx_conversations_status ON conversations(status);

-- للبحث بالتاريخ
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- للبحث بالفئة
CREATE INDEX idx_knowledge_category ON knowledge_base(category);
```

---

## Sample Queries

```sql
-- البحث عن محادثات مشابهة (Vector Search)
SELECT 
    id,
    client_message,
    doctor_response,
    1 - (embedding <=> $1) as similarity
FROM knowledge_base
WHERE 1 - (embedding <=> $1) > 0.7
ORDER BY embedding <=> $1
LIMIT 5;

-- إحصائيات اليوم
SELECT 
    status,
    COUNT(*) as count
FROM conversations
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY status;
```

---

## Hosting Options

| الخيار | المجاني | التكلفة |
|--------|---------|---------|
| Supabase | 500MB | $25/mo |
| Railway | - | ~$5-20/mo |
| Neon | 512MB | $19/mo |
