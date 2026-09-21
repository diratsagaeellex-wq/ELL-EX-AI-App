const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const requests = new Map();

function clientKey(request) {
  return request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(key) {
  const now = Date.now();
  const recent = (requests.get(key) || []).filter(
    (time) => now - time < WINDOW_MS
  );

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
    return response
      .status(429)
      .json({ error: "Please wait a moment before asking again." });
  }

  const question =
    typeof request.body?.question === "string"
      ? request.body.question.trim()
      : "";

  const mode =
    typeof request.body?.mode === "string"
      ? request.body.mode.trim()
      : "Ask";

  if (!question || question.length > 3000) {
    return response
      .status(400)
      .json({ error: "Please enter a question under 3,000 characters." });
  }

  const token = process.env.HF_TOKEN;

  if (!token) {
    return response.status(503).json({
      error: "ELL-EX AI is not configured yet.",
      code: "AI_NOT_CONFIGURED",
    });
  }

  try {
    const aiResponse = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b:cheapest",
          messages: [
            {
              role: "system",
              content: `You are ELL-EX Core, a clear, practical and safety-conscious AI assistant. The user selected ${mode} mode. Answer directly and concisely.`,
            },
            {
              role: "user",
              content: question,
            },
          ],
          max_tokens: 350,
          stream: false,
        }),
      }
    );

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error(
        "Hugging Face error",
        aiResponse.status,
        data?.error?.message || data?.error || data
      );

      return response.status(502).json({
        error: "The AI service is temporarily unavailable.",
      });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return response.status(502).json({
        error: "The AI returned an empty response.",
      });
    }

    return response.status(200).json({ text });
  } catch (error) {
    console.error("ELL-EX chat error", error);

    return response.status(500).json({
      error: "ELL-EX could not complete that request.",
    });
  }
    }
