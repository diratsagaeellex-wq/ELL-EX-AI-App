import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/chat.js";

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

test("requests a complete mobile-friendly Build answer", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.HF_TOKEN;
  let payload;

  process.env.HF_TOKEN = "test-token";
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ finish_reason: "length", message: { content: "```html\n<p>Build</p>\n```" } }],
      }),
    };
  };

  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = originalToken;
  });

  const response = responseRecorder();
  await handler(
    { method: "POST", headers: { "x-forwarded-for": "build-test" }, body: { question: "Build a bakery site", mode: "Build" } },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(payload.max_tokens, 3000);
  assert.match(payload.messages[0].content, /complete, runnable, mobile-friendly HTML document/);
  assert.equal(response.body.complete, false);
});

test("asks Plan mode to avoid wide tables", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.HF_TOKEN;
  let payload;

  process.env.HF_TOKEN = "test-token";
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ finish_reason: "stop", message: { content: "Seven complete days" } }] }),
    };
  };

  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = originalToken;
  });

  const response = responseRecorder();
  await handler(
    { method: "POST", headers: { "x-forwarded-for": "plan-test" }, body: { question: "Plan seven days", mode: "Plan" } },
    response
  );

  assert.match(payload.messages[0].content, /bullet lists instead of Markdown tables/);
  assert.equal(response.body.complete, true);
});
