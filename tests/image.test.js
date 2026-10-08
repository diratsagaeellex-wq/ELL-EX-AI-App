import test from "node:test";
import assert from "node:assert/strict";
import { InferenceClientProviderApiError } from "@huggingface/inference";
import handler, { classifyImageError } from "../api/image.js";

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
    send(value) {
      this.body = value;
      return this;
    },
  };
}

test("identifies exhausted Hugging Face image credits", () => {
  const error = new InferenceClientProviderApiError(
    "Failed to perform inference: You have no remaining credits.",
    { url: "https://router.huggingface.co", method: "POST" },
    { requestId: "test", status: 402, body: { error: "No remaining credits" } },
  );

  assert.deepEqual(classifyImageError(error), {
    status: 402,
    code: "IMAGE_CREDITS_EXHAUSTED",
    error: "ELL-EX image creation has paused because the Hugging Face account has no remaining credits. Add Hugging Face credits to restore Create.",
  });
});

test("returns the credit error from the image endpoint", async (context) => {
  const originalToken = process.env.HF_TOKEN;

  process.env.HF_TOKEN = "test-token";

  context.after(() => {
    if (originalToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = originalToken;
  });

  class CreditExhaustedClient {
    async textToImage() {
      throw new InferenceClientProviderApiError(
        "Failed to perform inference: You have no remaining credits.",
        { url: "https://router.huggingface.co", method: "POST" },
        { requestId: "test", status: 402, body: { error: "No remaining credits" } },
      );
    }
  }

  const response = responseRecorder();
  await handler(
    { method: "POST", headers: { "x-forwarded-for": "image-credit-test" }, body: { prompt: "A blue and gold poster" } },
    response,
    { InferenceClient: CreditExhaustedClient },
  );

  assert.equal(response.statusCode, 402);
  assert.equal(response.body.code, "IMAGE_CREDITS_EXHAUSTED");
  assert.match(response.body.error, /no remaining credits/i);
});

test("keeps unexpected provider failures temporary", () => {
  assert.deepEqual(classifyImageError(new Error("Network failed")), {
    status: 502,
    code: "IMAGE_PROVIDER_UNAVAILABLE",
    error: "The image service is temporarily unavailable.",
  });
});
