# 🚀 Quick Start Guide

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 15+** with pgvector extension
- **Flutter 3.0+** (for the mobile/desktop app)
- **OpenAI API Key**

---

## 1. Database Setup (PostgreSQL + pgvector)

### Windows
```bash
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Then install pgvector from https://github.com/pgvector/pgvector/releases

# Create database
createdb nutrition_assistant

# Enable pgvector (in psql)
psql -d nutrition_assistant -c "CREATE EXTENSION vector;"
```

### Mac
```bash
brew install postgresql@15 pgvector
brew services start postgresql@15
createdb nutrition_assistant
psql -d nutrition_assistant -c "CREATE EXTENSION vector;"
```

### Linux (Ubuntu)
```bash
sudo apt install postgresql postgresql-contrib
# Install pgvector following: https://github.com/pgvector/pgvector

createdb nutrition_assistant
psql -d nutrition_assistant -c "CREATE EXTENSION vector;"
```

---

## 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Edit .env file with your credentials:
# - DATABASE_URL=postgresql://postgres:password@localhost:5432/nutrition_assistant
# - OPENAI_API_KEY=sk-your-key-here

# Create database tables
npm run migrate

# Add initial training data
npm run seed

# Start the server
npm run dev
```

Server runs at: http://localhost:3001

### Test the API
```bash
node test/test-api.js
```

---

## 3. Flutter App Setup

```bash
cd flutter_app

# Install dependencies
flutter pub get

# Run on Windows
flutter run -d windows

# Run on Android/iOS
flutter run

# Build APK
flutter build apk
```

### Default Login
- Email: `doctor@nutrition.sa`
- Password: `doctor123`

---

## 4. WhatsApp Setup (Production)

See `docs/WHATSAPP_SETUP.md` for detailed WhatsApp Business API setup.

Quick overview:
1. Create Meta Business Account
2. Set up WhatsApp Business API
3. Configure webhook URL: `https://your-domain.com/webhook`
4. Add tokens to `.env`

---

## 🧪 Testing Without WhatsApp

You can test the full system without WhatsApp:

1. Start the backend: `npm run dev`
2. Login via Flutter app
3. Manually add messages to database:

```sql
-- Add a test conversation
INSERT INTO conversations (client_phone, client_name)
VALUES ('+966500000001', 'عميل تجريبي');

-- Add a test message
INSERT INTO messages (conversation_id, direction, content, status)
VALUES (1, 'inbound', 'دكتور تعبت من الدايت', 'pending');
```

4. The message will appear in the Flutter app inbox
5. Generate AI response and approve it

---

## 📊 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Login |
| `GET /api/messages/pending` | Pending messages |
| `POST /api/messages/:id/approve` | Approve & send |
| `GET /api/knowledge` | Knowledge base |
| `GET /api/stats/overview` | Statistics |
| `POST /webhook` | WhatsApp webhook |

---

## 🔧 Troubleshooting

### Database connection error
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Make sure pgvector is installed

### OpenAI errors
- Verify API key is valid
- Check account has credits
- API key should start with `sk-`

### Flutter build errors
- Run `flutter clean && flutter pub get`
- Check Flutter version: `flutter --version`

---

## 📁 Project Structure

```
AI_Customer_Responser/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── services/       # RAG, Vision, WhatsApp
│   │   ├── routes/         # API endpoints
│   │   └── database/       # Migrations
│   └── test/               # Test scripts
│
├── flutter_app/            # Cross-platform app
│   └── lib/
│       ├── features/       # Screens
│       └── data/           # Models & services
│
├── prototype/              # Original React demo
└── docs/                   # Documentation
```

---

## 💰 Cost Estimate

| Service | Monthly Cost |
|---------|--------------|
| OpenAI (GPT-4o-mini) | ~$15 |
| OpenAI (Embeddings) | ~$5 |
| OpenAI (Vision) | ~$30 |
| WhatsApp API | ~$75-100 |
| **Total** | **~$125-150** |
