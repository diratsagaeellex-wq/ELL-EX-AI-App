// Base64 adds roughly one third to the original file size. Stay below
// Vercel's function request limit after JSON overhead is included.
const MAX_IMAGE_LENGTH = 3_900_000;
const DEFAULT_VISION_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

function visionModels() {
  return [...new Set([
    process.env.GEMINI_VISION_MODEL,
    ...DEFAULT_VISION_MODELS,
  ].filter(Boolean))];
}

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim();
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const question =
    typeof request.body?.question === 'string'
      ? request.body.question.trim().slice(0, 1200)
      : 'Describe this image clearly.';
  const image = typeof request.body?.image === 'string' ? request.body.image : '';

  if (!image.startsWith('data:image/') || image.length > MAX_IMAGE_LENGTH) {
    return response
      .status(400)
      .json({ error: 'Please choose a valid image under 8 MB.' });
  }

  const match = image.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );

  if (!match) {
    return response.status(400).json({ error: 'Invalid image format.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(503).json({
      error: 'ELL-EX Vision is not configured yet.',
      code: 'VISION_NOT_CONFIGURED',
    });
  }

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: question },
          {
            inline_data: {
              mime_type: match[1],
              data: match[2],
            },
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 800 },
  };

  const models = visionModels();

  for (const [index, model] of models.entries()) {
    try {
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );
      const data = await aiResponse.json().catch(() => ({}));

      if (aiResponse.ok) {
        const text = extractText(data);
        if (text) {
          return response.status(200).json({ text });
        }
        console.error('Gemini vision returned an empty response', model);
      } else {
        console.error('Gemini vision error', model, aiResponse.status, data);
        const hasFallback = index < models.length - 1;
        if (!hasFallback || !RETRYABLE_STATUSES.has(aiResponse.status)) {
          return response.status(502).json({
            error: 'ELL-EX Vision could not analyse that image. Please try again.',
            code: 'VISION_PROVIDER_ERROR',
          });
        }
      }
    } catch (error) {
      console.error('ELL-EX vision request error', model, error);
    }
  }

  return response.status(503).json({
    error: 'ELL-EX Vision is temporarily busy. Please try again in a moment.',
    code: 'VISION_TEMPORARILY_UNAVAILABLE',
  });
}
