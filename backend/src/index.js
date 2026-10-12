require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/database');
const { initWebSocket } = require('./services/websocket.service');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database connection
    await initDatabase();
    console.log('✅ Database connected successfully');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`📱 WhatsApp Webhook: http://localhost:${PORT}/webhook`);
    });

    // Initialize WebSocket for real-time updates
    initWebSocket(server);
    console.log('🔌 WebSocket initialized');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
