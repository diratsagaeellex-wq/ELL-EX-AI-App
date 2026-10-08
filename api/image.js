import { InferenceClient, InferenceClientProviderApiError } from "@huggingface/inference";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 4;
const requests = new Map();

function clientKey(request) {
  return request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(key) {
  const now = Date.now();
  const recent = (requests.get(key) || []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  requests.set(key, recent);
  return recent.length > MAX_REQUESTS;
}

export function classifyImageError(error) {
  const providerStatus = error instanceof InferenceClientProviderApiError
    ? error.httpResponse?.status
    : error?.httpResponse?.status;
  const message = typeof error?.message === "string" ? error.message : "";

  if (providerStatus === 402 || /no remaining credits|purchase pre-paid credits/i.test(message)) {
    return {
      status: 402,
      code: "IMAGE_CREDITS_EXHAUSTED",
      error: "ELL-EX image creation has paused because the Hugging Face account has no remaining credits. Add Hugging Face credits to restore Create.",
    };
  }

  if (providerStatus === 401 || providerStatus === 403) {
    return {
      status: 503,
      code: "IMAGE_AUTHENTICATION_FAILED",
      error: "ELL-EX image creation could not authenticate with Hugging Face. Check the configured HF_TOKEN.",
    };
  }

  if (providerStatus === 429) {
    return {
      status: 429,
      code: "IMAGE_PROVIDER_RATE_LIMITED",
      error: "The image provider is receiving too many requests. Please wait a moment and try again.",
    };
  }

  return {
    status: 502,
    code: "IMAGE_PROVIDER_UNAVAILABLE",
    error: "The image service is temporarily unavailable.",
  };
}

export default async function handler(request, response, dependencies = {}) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  if (rateLimited(clientKey(request))) {
    return response.status(429).json({ error: "Please wait a moment before creating another image." });
  }

  const prompt = typeof request.body?.prompt === "string" ? request.body.prompt.trim() : "";
  if (!prompt || prompt.length > 1000) {
    return response.status(400).json({ error: "Please enter an image description under 1,000 characters." });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return response.status(503).json({
      code: "IMAGE_NOT_CONFIGURED",
      error: "ELL-EX image creation is not configured yet.",
    });
  }

  try {
    const ImageClient = dependencies.InferenceClient || InferenceClient;
    const client = new ImageClient(token);
    const imageBlob = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: prompt,
      provider: "auto",
    });

    const image = Buffer.from(await imageBlob.arrayBuffer());
    response.setHeader("Content-Type", imageBlob.type || "image/jpeg");
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).send(image);
  } catch (error) {
    const failure = classifyImageError(error);
    console.error("Hugging Face image error", {
      name: error?.name,
      message: error?.message,
      status: error?.httpResponse?.status,
      code: failure.code,
    });
    return response.status(failure.status).json({ code: failure.code, error: failure.error });
  }
}
