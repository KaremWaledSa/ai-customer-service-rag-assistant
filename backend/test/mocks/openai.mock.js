/**
 * OpenAI Mock for Unit Tests
 */

// Mock embedding (1536 dimensions of zeros for testing)
const mockEmbedding = new Array(1536).fill(0).map((_, i) => Math.sin(i) * 0.1);

// Mock chat response
const mockChatResponse = {
  choices: [{
    message: {
      content: 'أنا فاهمك تمامًا، طبيعي جدًا توصلي لهالمرحلة. المهم ما نستسلم.'
    }
  }],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150
  }
};

// Mock vision response
const mockVisionResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        foods: [
          { name_ar: 'رز', portion: 'كوب', calories: 200 },
          { name_ar: 'دجاج', portion: '100 جرام', calories: 165 }
        ],
        total_calories: 365,
        assessment: 'healthy',
        notes_ar: 'وجبة متوازنة'
      })
    }
  }],
  usage: {
    prompt_tokens: 500,
    completion_tokens: 100,
    total_tokens: 600
  }
};

// Mock OpenAI client
const mockOpenAI = {
  embeddings: {
    create: jest.fn().mockResolvedValue({
      data: [{ embedding: mockEmbedding }],
      usage: { total_tokens: 10 }
    })
  },

  chat: {
    completions: {
      create: jest.fn().mockImplementation(async (options) => {
        // Check if it's a vision request
        if (options.messages?.[0]?.content?.[0]?.type === 'image_url') {
          return mockVisionResponse;
        }
        return mockChatResponse;
      })
    }
  }
};

// Reset mocks
const resetMocks = () => {
  mockOpenAI.embeddings.create.mockClear();
  mockOpenAI.chat.completions.create.mockClear();
};

module.exports = {
  openai: mockOpenAI,
  mockEmbedding,
  mockChatResponse,
  mockVisionResponse,
  resetMocks,
  MODELS: {
    CHAT: 'gpt-4o-mini',
    VISION: 'gpt-4o',
    EMBEDDING: 'text-embedding-3-small'
  },
  EMBEDDING_DIMENSION: 1536
};
