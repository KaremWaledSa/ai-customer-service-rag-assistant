# AI Customer-Service RAG Assistant

A full-stack prototype for assisting customer-service teams on WhatsApp. It retrieves relevant examples from an approved knowledge base, drafts a context-aware reply, and keeps a human operator in the approval loop before sending.

## Why this project matters

The system addresses a real operational problem: repetitive customer conversations must be answered quickly without losing the business's tone or giving an unreviewed AI direct control of the communication channel.

```text
Incoming message
      ↓
Similarity search over approved examples
      ↓
Context assembly + response generation
      ↓
Human review / edit / approval
      ↓
WhatsApp delivery + feedback capture
```

## Implemented components

- Node.js/Express REST backend with authentication and rate limiting
- PostgreSQL + `pgvector` data model for semantic retrieval
- OpenAI-compatible generation and embedding service layer
- WhatsApp Business API integration layer
- Flutter operator inbox for reviewing and approving replies
- React/Vite proof of concept for rapid workflow validation
- Unit and integration tests with mocked external services
- Docker Compose development environment

## Repository structure

```text
backend/      API, RAG services, authentication, tests
database/     schema and data-model notes
flutter_app/  operator approval dashboard
prototype/    early React workflow prototype
whatsapp/     channel-integration documentation
docs/         architecture, prompts, roadmap, and setup notes
```

## My role

Implementation, integration, and R&D under the Entropia Studio development account. The portfolio version emphasizes the engineering work and contains no production credentials or customer conversation exports.

## Run the backend

Requirements: Node.js 18+, PostgreSQL with `pgvector`, and credentials for the external services you choose to enable.

```bash
cd backend
cp .env.example .env
npm install
npm test
npm run dev
```

Never place real credentials in source control. The values in tests and examples are non-production placeholders.

## Project status

Functional prototype / engineering case study. The backend currently passes **118 unit and integration tests**, and the React prototype completes a production build. External integrations require the operator's own accounts and configuration. AI output must remain human-reviewed, especially in regulated or high-impact domains.
