import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/vision.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

function restoreEnvironment(originalFetch, originalKey, originalModel) {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_VISION_MODEL;
  else process.env.GEMINI_VISION_MODEL = originalModel;
}

const validRequest = {
  method: 'POST',
  body: {
    question: 'What is in this image?',
    image: 'data:image/jpeg;base64,YQ==',
  },
};

test('retries a busy primary vision model with the stable fallback', async (context) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_VISION_MODEL;
  const urls = [];

  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_VISION_MODEL;
  globalThis.fetch = async (url) => {
    urls.push(url);
    if (urls.length === 1) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'High demand' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Two bottles.' }] } }],
      }),
    };
  };
  context.after(() => restoreEnvironment(originalFetch, originalKey, originalModel));

  const response = responseRecorder();
  await handler(validRequest, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.text, 'Two bottles.');
  assert.equal(urls.length, 2);
  assert.match(urls[0], /gemini-3\.8-flash/);
  assert.match(urls[1], /gemini-3\.5-flash-lite/);
});

test('returns a clear temporary error when all vision models are busy', async (context) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_VISION_MODEL;
  let calls = 0;

  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_VISION_MODEL;
  globalThis.fetch = async () => {
    calls += 1;
    return {
      ok: false,
      status: 503,
      json: async () => ({ error: { message: 'High demand' } }),
    };
  };
  context.after(() => restoreEnvironment(originalFetch, originalKey, originalModel));

  const response = responseRecorder();
  await handler(validRequest, response);

  assert.equal(calls, 2);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'VISION_TEMPORARILY_UNAVAILABLE');
  assert.match(response.body.error, /temporarily busy/i);
});

test('identifies a missing Gemini key as vision configuration', async (context) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_VISION_MODEL;

  delete process.env.GEMINI_API_KEY;
  context.after(() => restoreEnvironment(originalFetch, originalKey, originalModel));

  const response = responseRecorder();
  await handler(validRequest, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'VISION_NOT_CONFIGURED');
  assert.match(response.body.error, /Vision is not configured/);
});
