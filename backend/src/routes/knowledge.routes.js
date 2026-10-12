const express = require('express');
const { query } = require('../config/database');
const { createEmbedding, createEmbeddingsBatch } = require('../services/embeddings.service');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

/**
 * GET /api/knowledge
 * Get all knowledge base entries
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, source } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [limit, offset];
    let paramIndex = 3;

    if (category) {
      whereClause += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (source) {
      whereClause += ` AND source = $${paramIndex++}`;
      params.push(source);
    }

    const result = await query(`
      SELECT id, client_message, doctor_response, category, source, times_retrieved, created_at
      FROM knowledge_base
      WHERE 1=1 ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) FROM knowledge_base WHERE 1=1 ${whereClause}
    `, params.slice(2));

    // Get stats
    const statsResult = await query(`
      SELECT
        source,
        COUNT(*) as count
      FROM knowledge_base
      GROUP BY source
    `);

    res.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      stats: statsResult.rows
    });
  } catch (error) {
    console.error('Get knowledge error:', error);
    res.status(500).json({ error: 'Failed to get knowledge base' });
  }
});

/**
 * GET /api/knowledge/search
 * Search knowledge base by text
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query too short' });
    }

    // Create embedding for search query
    const queryEmbedding = await createEmbedding(q);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Vector similarity search
    const result = await query(`
      SELECT
        id,
        client_message,
        doctor_response,
        category,
        source,
        1 - (embedding <=> $1::vector) as similarity
      FROM knowledge_base
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `, [embeddingStr, limit]);

    res.json({ results: result.rows });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * POST /api/knowledge
 * Add new knowledge base entry
 */
router.post('/', async (req, res) => {
  try {
    const { client_message, doctor_response, category = 'uploaded' } = req.body;

    if (!client_message || !doctor_response) {
      return res.status(400).json({ error: 'client_message and doctor_response required' });
    }

    // Create embedding
    const embedding = await createEmbedding(client_message);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await query(`
      INSERT INTO knowledge_base (client_message, doctor_response, category, embedding, source)
      VALUES ($1, $2, $3, $4::vector, 'uploaded')
      RETURNING id, client_message, doctor_response, category, source, created_at
    `, [client_message, doctor_response, category, embeddingStr]);

    res.status(201).json({ entry: result.rows[0] });
  } catch (error) {
    console.error('Add knowledge error:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

/**
 * POST /api/knowledge/bulk
 * Bulk upload knowledge base entries
 */
router.post('/bulk', async (req, res) => {
  try {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array required' });
    }

    // Limit batch size
    if (entries.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 entries per batch' });
    }

    // Create embeddings in batch
    const texts = entries.map(e => e.client_message);
    const embeddings = await createEmbeddingsBatch(texts);

    // Insert all entries
    let inserted = 0;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const embedding = embeddings[i];
      const embeddingStr = `[${embedding.join(',')}]`;

      try {
        await query(`
          INSERT INTO knowledge_base (client_message, doctor_response, category, embedding, source)
          VALUES ($1, $2, $3, $4::vector, 'uploaded')
        `, [entry.client_message, entry.doctor_response, entry.category || 'uploaded', embeddingStr]);
        inserted++;
      } catch (err) {
        console.error(`Entry ${i} failed:`, err.message);
      }
    }

    res.status(201).json({
      message: `Uploaded ${inserted} of ${entries.length} entries`,
      inserted
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

/**
 * PUT /api/knowledge/:id
 * Update knowledge base entry
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client_message, doctor_response, category } = req.body;

    // Get existing entry
    const existing = await query('SELECT * FROM knowledge_base WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Update embedding if client_message changed
    let embeddingUpdate = '';
    const params = [
      client_message || existing.rows[0].client_message,
      doctor_response || existing.rows[0].doctor_response,
      category || existing.rows[0].category,
      id
    ];

    if (client_message && client_message !== existing.rows[0].client_message) {
      const embedding = await createEmbedding(client_message);
      const embeddingStr = `[${embedding.join(',')}]`;
      embeddingUpdate = ', embedding = $5::vector';
      params.push(embeddingStr);
    }

    const result = await query(`
      UPDATE knowledge_base
      SET client_message = $1, doctor_response = $2, category = $3 ${embeddingUpdate}
      WHERE id = $4
      RETURNING id, client_message, doctor_response, category, source, created_at
    `, params);

    res.json({ entry: result.rows[0] });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

/**
 * DELETE /api/knowledge/:id
 * Delete knowledge base entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM knowledge_base WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ success: true, deleted: id });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
