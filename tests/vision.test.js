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

function restoreEnvironment(originalFetch, environment) {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function saveEnvironment() {
  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_VISION_MODEL: process.env.GEMINI_VISION_MODEL,
    HF_TOKEN: process.env.HF_TOKEN,
    HF_VISION_MODEL: process.env.HF_VISION_MODEL,
  };
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
  const environment = saveEnvironment();
  const urls = [];

  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.HF_TOKEN;
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
  context.after(() => restoreEnvironment(originalFetch, environment));

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
  const environment = saveEnvironment();
  let calls = 0;

  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.HF_TOKEN;
  delete process.env.GEMINI_VISION_MODEL;
  globalThis.fetch = async () => {
    calls += 1;
    return {
      ok: false,
      status: 503,
      json: async () => ({ error: { message: 'High demand' } }),
    };
  };
  context.after(() => restoreEnvironment(originalFetch, environment));

  const response = responseRecorder();
  await handler(validRequest, response);

  assert.equal(calls, 2);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'VISION_TEMPORARILY_UNAVAILABLE');
  assert.match(response.body.error, /temporarily busy/i);
});

test('identifies a missing Gemini key as vision configuration', async (context) => {
  const originalFetch = globalThis.fetch;
  const environment = saveEnvironment();

  delete process.env.GEMINI_API_KEY;
  delete process.env.HF_TOKEN;
  context.after(() => restoreEnvironment(originalFetch, environment));

  const response = responseRecorder();
  await handler(validRequest, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'VISION_NOT_CONFIGURED');
  assert.match(response.body.error, /Vision is not configured/);
});

test('uses the existing Hugging Face token when Gemini is not configured', async (context) => {
  const originalFetch = globalThis.fetch;
  const environment = saveEnvironment();
  let request;

  delete process.env.GEMINI_API_KEY;
  process.env.HF_TOKEN = 'hf-test-key';
  delete process.env.HF_VISION_MODEL;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'A bright screen in a dark room.' } }],
      }),
    };
  };
  context.after(() => restoreEnvironment(originalFetch, environment));

  const response = responseRecorder();
  await handler(validRequest, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.text, 'A bright screen in a dark room.');
  assert.equal(response.body.provider, 'huggingface');
  assert.equal(request.url, 'https://router.huggingface.co/v1/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer hf-test-key');
  const body = JSON.parse(request.options.body);
  assert.equal(
    body.model,
    'Qwen/Qwen2.5-VL-3B-Instruct:featherless-ai'
  );
  assert.equal(body.messages[0].content[1].image_url.url, validRequest.body.image);
});

test('reports exhausted Hugging Face vision credits accurately', async (context) => {
  const originalFetch = globalThis.fetch;
  const environment = saveEnvironment();

  delete process.env.GEMINI_API_KEY;
  process.env.HF_TOKEN = 'hf-test-key';
  globalThis.fetch = async () => ({
    ok: false,
    status: 402,
    json: async () => ({ error: 'Payment required' }),
  });
  context.after(() => restoreEnvironment(originalFetch, environment));

  const response = responseRecorder();
  await handler(validRequest, response);

  assert.equal(response.statusCode, 402);
  assert.equal(response.body.code, 'VISION_CREDITS_EXHAUSTED');
  assert.match(response.body.error, /provider credit/i);
});
