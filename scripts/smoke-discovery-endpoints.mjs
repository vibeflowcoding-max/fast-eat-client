const baseUrl = process.env.HOME_SMOKE_BASE_URL || 'http://localhost:3000';

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-trace-id': `smoke-${Date.now()}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`);
  }

  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const recommendations = await post('/api/discovery/recommendations', { limit: 3 });
  assert(Array.isArray(recommendations.rails), 'Recommendations must include rails array');

  const chat = await post('/api/discovery/chat', {
    sessionId: `smoke-${Date.now()}`,
    locale: 'es-CR',
    query: 'algo barato',
    history: [],
    surface: 'home'
  });
  assert(typeof chat.answer === 'string', 'Chat must include answer');

  console.log('Discovery endpoint smoke tests passed.');
})();
