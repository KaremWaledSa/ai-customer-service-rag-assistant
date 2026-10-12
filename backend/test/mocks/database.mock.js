/**
 * Database Mock for Unit Tests
 */

const mockQuery = jest.fn();
const mockGetPool = jest.fn();

// Default mock implementations
mockQuery.mockImplementation(async (text, params) => {
  // Return empty result by default
  return { rows: [], rowCount: 0 };
});

mockGetPool.mockImplementation(() => ({
  query: mockQuery,
  connect: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: jest.fn()
  })
}));

// Mock data
const mockData = {
  users: [
    {
      id: 1,
      email: 'doctor@nutrition.sa',
      password_hash: '$2a$10$test',
      name: 'دكتور التغذية',
      phone: '+966500000000',
      role: 'doctor',
      created_at: new Date()
    }
  ],

  conversations: [
    {
      id: 1,
      client_phone: '+966500000001',
      client_name: 'عميل تجريبي',
      last_message_at: new Date(),
      total_messages: 5
    }
  ],

  messages: [
    {
      id: 1,
      conversation_id: 1,
      direction: 'inbound',
      content: 'دكتور تعبت من الدايت',
      content_type: 'text',
      status: 'pending',
      received_at: new Date(),
      created_at: new Date()
    }
  ],

  knowledgeBase: [
    {
      id: 1,
      client_message: 'دكتور تعبت من الدايت ومليت',
      doctor_response: 'أنا فاهمك تمامًا، طبيعي جدًا توصلي لهالمرحلة',
      category: 'motivation',
      source: 'initial',
      similarity: 0.85
    }
  ]
};

// Helper to set up specific mock responses
const setupMockResponse = (queryPattern, response) => {
  mockQuery.mockImplementation(async (text, params) => {
    if (text.toLowerCase().includes(queryPattern.toLowerCase())) {
      return response;
    }
    return { rows: [], rowCount: 0 };
  });
};

// Reset all mocks
const resetMocks = () => {
  mockQuery.mockClear();
  mockGetPool.mockClear();
};

module.exports = {
  query: mockQuery,
  getPool: mockGetPool,
  initDatabase: jest.fn().mockResolvedValue(true),
  mockData,
  setupMockResponse,
  resetMocks
};
