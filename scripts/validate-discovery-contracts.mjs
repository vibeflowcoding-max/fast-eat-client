import fs from 'node:fs';
import path from 'node:path';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateRecommendation(item) {
  assert(isObject(item), 'Recommendation must be object');
  assert(typeof item.id === 'string', 'Recommendation.id must be string');
  assert(typeof item.restaurantId === 'string', 'Recommendation.restaurantId must be string');
  assert(typeof item.title === 'string', 'Recommendation.title must be string');
  assert(typeof item.score === 'number', 'Recommendation.score must be number');
  assert(Array.isArray(item.reasons), 'Recommendation.reasons must be array');
}

function validateDiscoveryChat(payload) {
  assert(isObject(payload), 'Chat payload must be object');
  assert(typeof payload.answer === 'string', 'Chat.answer must be string');
  assert(Array.isArray(payload.recommendations), 'Chat.recommendations must be array');
  payload.recommendations.forEach(validateRecommendation);
  assert(Array.isArray(payload.followUps), 'Chat.followUps must be array');
  assert(typeof payload.traceId === 'string', 'Chat.traceId must be string');
}

function validateDiscoveryRecommendations(payload) {
  assert(isObject(payload), 'Recommendations payload must be object');
  assert(Array.isArray(payload.rails), 'Recommendations.rails must be array');
  payload.rails.forEach((rail) => {
    assert(isObject(rail), 'Rail must be object');
    assert(typeof rail.railId === 'string', 'Rail.railId must be string');
    assert(typeof rail.title === 'string', 'Rail.title must be string');
    assert(Array.isArray(rail.items), 'Rail.items must be array');
  });
  assert(typeof payload.generatedAt === 'string', 'Recommendations.generatedAt must be string');
  assert(typeof payload.strategyVersion === 'string', 'Recommendations.strategyVersion must be string');
}

function loadJson(relativePath) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

const chatFixture = loadJson('src/contracts/discovery/chat-response.sample.json');
const recommendationsFixture = loadJson('src/contracts/discovery/recommendations-response.sample.json');

validateDiscoveryChat(chatFixture);
validateDiscoveryRecommendations(recommendationsFixture);

console.log('Discovery response contracts validated successfully.');
