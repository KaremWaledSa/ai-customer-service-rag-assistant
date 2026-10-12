const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const { getConnectedCount } = require('../services/websocket.service');

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

/**
 * GET /api/stats/usage
 * Get API usage and cost statistics
 */
router.get('/usage', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get usage stats for the period
    const result = await query(`
      SELECT
        date,
        embeddings_tokens,
        chat_tokens_input,
        chat_tokens_output,
        vision_tokens,
        embeddings_cost,
        chat_cost,
        vision_cost,
        whatsapp_conversations,
        whatsapp_cost,
        messages_received,
        messages_sent,
        images_processed,
        (embeddings_cost + chat_cost + vision_cost + whatsapp_cost) as total_cost
      FROM api_usage
      WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY date DESC
    `);

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => ({
      embeddings_tokens: acc.embeddings_tokens + (row.embeddings_tokens || 0),
      chat_tokens_input: acc.chat_tokens_input + (row.chat_tokens_input || 0),
      chat_tokens_output: acc.chat_tokens_output + (row.chat_tokens_output || 0),
      vision_tokens: acc.vision_tokens + (row.vision_tokens || 0),
      embeddings_cost: acc.embeddings_cost + parseFloat(row.embeddings_cost || 0),
      chat_cost: acc.chat_cost + parseFloat(row.chat_cost || 0),
      vision_cost: acc.vision_cost + parseFloat(row.vision_cost || 0),
      whatsapp_cost: acc.whatsapp_cost + parseFloat(row.whatsapp_cost || 0),
      messages_received: acc.messages_received + (row.messages_received || 0),
      messages_sent: acc.messages_sent + (row.messages_sent || 0),
      images_processed: acc.images_processed + (row.images_processed || 0)
    }), {
      embeddings_tokens: 0,
      chat_tokens_input: 0,
      chat_tokens_output: 0,
      vision_tokens: 0,
      embeddings_cost: 0,
      chat_cost: 0,
      vision_cost: 0,
      whatsapp_cost: 0,
      messages_received: 0,
      messages_sent: 0,
      images_processed: 0
    });

    totals.total_cost = totals.embeddings_cost + totals.chat_cost + totals.vision_cost + totals.whatsapp_cost;

    res.json({
      daily: result.rows,
      totals,
      period_days: parseInt(days)
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

/**
 * GET /api/stats/daily
 * Get daily message statistics
 */
router.get('/daily', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const result = await query(`
      SELECT
        DATE(received_at) as date,
        COUNT(*) FILTER (WHERE direction = 'inbound') as received,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'pending' OR status = 'ready') as pending
      FROM messages
      WHERE received_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(received_at)
      ORDER BY date DESC
    `);

    res.json({ stats: result.rows });
  } catch (error) {
    console.error('Daily stats error:', error);
    res.status(500).json({ error: 'Failed to get daily stats' });
  }
});

/**
 * GET /api/stats/overview
 * Get overall system statistics
 */
router.get('/overview', async (req, res) => {
  try {
    // Get various counts
    const [
      messagesCount,
      conversationsCount,
      knowledgeCount,
      pendingCount,
      todayCount
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM messages'),
      query('SELECT COUNT(*) FROM conversations'),
      query('SELECT COUNT(*) FROM knowledge_base'),
      query("SELECT COUNT(*) FROM messages WHERE status IN ('pending', 'ready')"),
      query("SELECT COUNT(*) FROM messages WHERE DATE(received_at) = CURRENT_DATE")
    ]);

    // Get knowledge base breakdown
    const kbBreakdown = await query(`
      SELECT source, COUNT(*) as count
      FROM knowledge_base
      GROUP BY source
    `);

    // Get top categories
    const topCategories = await query(`
      SELECT category, COUNT(*) as count
      FROM knowledge_base
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);

    res.json({
      total_messages: parseInt(messagesCount.rows[0].count),
      total_conversations: parseInt(conversationsCount.rows[0].count),
      knowledge_base_size: parseInt(knowledgeCount.rows[0].count),
      pending_messages: parseInt(pendingCount.rows[0].count),
      today_messages: parseInt(todayCount.rows[0].count),
      knowledge_breakdown: kbBreakdown.rows,
      top_categories: topCategories.rows,
      connected_clients: getConnectedCount()
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

/**
 * GET /api/stats/budget
 * Get budget status (monthly spending vs limit)
 */
router.get('/budget', async (req, res) => {
  try {
    const budget_limit = parseFloat(process.env.MONTHLY_BUDGET || 200);

    // Get current month's spending
    const result = await query(`
      SELECT
        SUM(embeddings_cost + chat_cost + vision_cost + whatsapp_cost) as total_spent
      FROM api_usage
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    `);

    const spent = parseFloat(result.rows[0].total_spent || 0);
    const remaining = budget_limit - spent;
    const percentage_used = (spent / budget_limit) * 100;

    // Project end-of-month spending
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyAverage = spent / dayOfMonth;
    const projected_total = dailyAverage * daysInMonth;

    res.json({
      budget_limit,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      percentage_used: Math.round(percentage_used * 10) / 10,
      projected_total: Math.round(projected_total * 100) / 100,
      daily_average: Math.round(dailyAverage * 100) / 100,
      status: percentage_used > 90 ? 'critical' : percentage_used > 75 ? 'warning' : 'ok'
    });
  } catch (error) {
    console.error('Budget error:', error);
    res.status(500).json({ error: 'Failed to get budget status' });
  }
});

module.exports = router;
