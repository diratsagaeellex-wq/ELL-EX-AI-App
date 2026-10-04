const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const MAX_OUTPUT_TOKENS = 3000;
const requests = new Map();

export const config = {
  maxDuration: 60,
};

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

function modeInstructions(mode) {
  if (mode === "Build") {
    return "For website or app requests, return one complete, runnable, mobile-friendly HTML document in a single fenced html block. Put CSS and JavaScript inside that document, close every tag and code fence, keep the build concise, and do not stop mid-file.";
  }

  if (mode === "Plan") {
    return "Complete every requested step or day. Prefer short headings and bullet lists instead of Markdown tables so the plan remains readable on a phone.";
  }

  if (mode === "Learn") {
    return "Use plain, phone-friendly notation for mathematics. If you create a quiz, do not reveal the answer until the learner responds.";
  }

  return "Prefer concise headings and lists. Avoid wide Markdown tables unless the user explicitly asks for one.";
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

  const document =
    typeof request.body?.document === "string"
      ? request.body.document.trim()
      : "";
  const documentName =
    typeof request.body?.documentName === "string"
      ? request.body.documentName.slice(0, 120)
      : "document";

  if (document.length > 12000) {
    return response.status(400).json({ error: "Document text exceeds 12,000 characters." });
  }

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
              content: `You are ELL-EX Core, a clear, practical and safety-conscious AI assistant created by Katlego Ellex Diratsagae. The user selected ${mode} mode. Answer directly, use complete sentences, and finish every plan or code sample. ${modeInstructions(mode)} Never claim to browse the live web or use tools unless the application explicitly provides them.`,
            },
            {
              role: "user",
              content: document
                ? `${question}\n\nAttached document (${documentName}):\n${document}`
                : question,
            },
          ],
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.35,
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

    const choice = data?.choices?.[0];
    const text = choice?.message?.content?.trim();

    if (!text) {
      return response.status(502).json({
        error: "The AI returned an empty response.",
      });
    }

    return response.status(200).json({
      text,
      complete: choice?.finish_reason !== "length",
    });
  } catch (error) {
    console.error("ELL-EX chat error", error);

    return response.status(500).json({
      error: "ELL-EX could not complete that request.",
    });
  }
    }
