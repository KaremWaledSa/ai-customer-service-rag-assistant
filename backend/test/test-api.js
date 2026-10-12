/**
 * Backend API Test Script
 * Run: node test/test-api.js
 */

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing Nutrition Assistant Backend API\n');
  console.log('=' .repeat(50));

  let token = null;

  // Test 1: Health Check
  console.log('\n📍 Test 1: Health Check');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    console.log('✅ Health check passed:', data.status);
  } catch (e) {
    console.log('❌ Health check failed:', e.message);
    console.log('\n⚠️  Make sure the server is running: npm run dev\n');
    return;
  }

  // Test 2: Login
  console.log('\n📍 Test 2: Login');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doctor@nutrition.sa',
        password: 'doctor123'
      })
    });
    const data = await res.json();

    if (data.token) {
      token = data.token;
      console.log('✅ Login successful');
      console.log('   User:', data.user.name || data.user.email);
    } else {
      console.log('❌ Login failed:', data.error);
    }
  } catch (e) {
    console.log('❌ Login failed:', e.message);
  }

  if (!token) {
    console.log('\n⚠️  Cannot continue without authentication\n');
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Test 3: Get Current User
  console.log('\n📍 Test 3: Get Current User');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: authHeaders
    });
    const data = await res.json();
    console.log('✅ User info retrieved:', data.user?.email);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 4: Get Pending Messages
  console.log('\n📍 Test 4: Get Pending Messages');
  try {
    const res = await fetch(`${BASE_URL}/api/messages/pending`, {
      headers: authHeaders
    });
    const data = await res.json();
    console.log('✅ Pending messages:', data.messages?.length || 0);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 5: Get Knowledge Base
  console.log('\n📍 Test 5: Get Knowledge Base');
  try {
    const res = await fetch(`${BASE_URL}/api/knowledge`, {
      headers: authHeaders
    });
    const data = await res.json();
    console.log('✅ Knowledge entries:', data.total || data.entries?.length || 0);

    if (data.stats) {
      console.log('   Stats:', data.stats.map(s => `${s.source}: ${s.count}`).join(', '));
    }
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 6: Search Knowledge Base
  console.log('\n📍 Test 6: Search Knowledge Base');
  try {
    const res = await fetch(`${BASE_URL}/api/knowledge/search?q=تعبت من الدايت`, {
      headers: authHeaders
    });
    const data = await res.json();
    console.log('✅ Search results:', data.results?.length || 0);

    if (data.results && data.results.length > 0) {
      console.log('   Top match:', data.results[0].client_message.substring(0, 50) + '...');
      console.log('   Similarity:', Math.round(data.results[0].similarity * 100) + '%');
    }
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 7: Get Stats Overview
  console.log('\n📍 Test 7: Get Stats Overview');
  try {
    const res = await fetch(`${BASE_URL}/api/stats/overview`, {
      headers: authHeaders
    });
    const data = await res.json();
    console.log('✅ Stats retrieved');
    console.log('   Messages:', data.total_messages);
    console.log('   Knowledge base:', data.knowledge_base_size);
    console.log('   Pending:', data.pending_messages);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 8: Get Budget Status
  console.log('\n📍 Test 8: Get Budget Status');
  try {
    const res = await fetch(`${BASE_URL}/api/stats/budget`, {
      headers: authHeaders
    });
    const data = await res.json();
    console.log('✅ Budget status');
    console.log('   Spent: $' + data.spent);
    console.log('   Remaining: $' + data.remaining);
    console.log('   Status:', data.status);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 9: WebSocket Connection
  console.log('\n📍 Test 9: WebSocket Check');
  console.log('   WebSocket URL: ws://localhost:3001/ws');
  console.log('   (WebSocket test requires browser or ws client)');

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 API Tests Completed!\n');
  console.log('Next steps:');
  console.log('1. Set up PostgreSQL with pgvector');
  console.log('2. Run: npm run migrate');
  console.log('3. Run: npm run seed');
  console.log('4. Add your OpenAI API key to .env');
  console.log('5. Test with Flutter app\n');
}

testAPI().catch(console.error);
