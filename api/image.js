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

export default async function handler(request, response) {
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
    return response.status(503).json({ error: "ELL-EX image creation is not configured yet." });
  }

  try {
    const imageResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/jpeg",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!imageResponse.ok) {
      const detail = await imageResponse.text();
      console.error("Hugging Face image error", imageResponse.status, detail);
      return response.status(502).json({ error: "The image service is temporarily unavailable." });
    }

    const image = Buffer.from(await imageResponse.arrayBuffer());
    response.setHeader("Content-Type", imageResponse.headers.get("content-type") || "image/jpeg");
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).send(image);
  } catch (error) {
    console.error("ELL-EX image error", error);
    return response.status(500).json({ error: "ELL-EX could not create that image." });
  }
}
