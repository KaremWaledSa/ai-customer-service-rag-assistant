/**
 * Jest Test Setup
 * Runs before all tests
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.WHATSAPP_VERIFY_TOKEN = 'test_verify_token';
process.env.WHATSAPP_TOKEN = 'test_whatsapp_token';
process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
process.env.OPENAI_API_KEY = 'test_openai_key';

// Increase timeout for API calls
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Generate random string
  randomString: (length = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate random phone number
  randomPhone: () => {
    return '+966' + Math.floor(500000000 + Math.random() * 100000000);
  },

  // Wait for a period
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Sample Arabic messages for testing
  sampleMessages: [
    'دكتور تعبت من الدايت ومليت',
    'وزني ثبت من أسبوعين',
    'ممكن آكل برجر اليوم؟',
    'الحمدلله نزلت 2 كيلو!',
    'حاسة بصداع من يومين',
    'نسيت آخذ المكمل أمس',
    'إيش أفطر اليوم؟',
    'أحس بجوع الليل وما أقدر أنام'
  ],

  // Get random sample message
  randomMessage: () => {
    const messages = global.testUtils.sampleMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  },

  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'doctor@nutrition.sa',
    name: 'دكتور التغذية',
    role: 'doctor',
    ...overrides
  }),

  // Create mock message
  createMockMessage: (overrides = {}) => ({
    id: 1,
    conversation_id: 1,
    content: 'دكتور تعبت من الدايت',
    content_type: 'text',
    status: 'pending',
    created_at: new Date(),
    ...overrides
  }),

  // Create mock conversation
  createMockConversation: (overrides = {}) => ({
    id: 1,
    client_phone: '+966500000001',
    client_name: 'عميل تجريبي',
    last_message_at: new Date(),
    total_messages: 5,
    ...overrides
  })
};

// Suppress console.error in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console.error = jest.fn();
  global.console.warn = jest.fn();
}

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 100));
});
