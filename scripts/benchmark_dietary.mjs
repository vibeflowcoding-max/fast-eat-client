const baseUrl = process.env.HOME_PERF_BASE_URL || 'http://localhost:3000';

async function postDietaryCheck(menuItem, dietaryProfile, mockAi = false) {
  const start = Date.now();
  const headers = {
    'content-type': 'application/json',
    'x-trace-id': `bench-${Date.now()}`
  };
  if (mockAi) {
    headers['x-mock-ai'] = 'true';
  }

  const response = await fetch(`${baseUrl}/api/discovery/dietary-check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      menu_item: menuItem,
      dietary_profile: dietaryProfile
    })
  });

  const duration = Date.now() - start;

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${text}`);
  }

  const data = await response.json();
  return { duration, data };
}

async function runBenchmark() {
  const menuItem = {
    id: 'item-123',
    name: 'Casado de Pollo',
    description: 'Plato tradicional costarricense',
    ingredients: ['arroz', 'frijoles', 'pollo', 'ensalada', 'plátano maduro']
  };

  const dietaryProfile = {
    diet: 'gluten-free',
    allergies: ['peanuts'],
    intolerances: ['lactose']
  };

  console.log('--- Starting Benchmark ---');

  // 1. Initial request (should be slow / uncached)
  console.log('Sending initial request (uncached)...');
  const res1 = await postDietaryCheck(menuItem, dietaryProfile, true);
  console.log(`Initial request took: ${res1.duration}ms`);

  // 2. Second request with same data (should be fast if cached)
  console.log('Sending second request with same data...');
  const res2 = await postDietaryCheck(menuItem, dietaryProfile, true);
  console.log(`Second request took: ${res2.duration}ms`);

  // 3. Request with different dietary profile
  console.log('Sending request with different dietary profile...');
  const res3 = await postDietaryCheck(menuItem, { ...dietaryProfile, diet: 'vegan' }, true);
  console.log(`Request with different profile took: ${res3.duration}ms`);

  console.log('--- Benchmark Finished ---');
}

runBenchmark().catch(console.error);
