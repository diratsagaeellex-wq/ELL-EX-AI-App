// Base64 adds roughly one third to the original file size. Stay below
// Vercel's function request limit after JSON overhead is included.
const MAX_IMAGE_LENGTH = 3_900_000;
const DEFAULT_VISION_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
// Pin the provider as well as the model. The Hugging Face router no longer
// reliably selects a provider for this VLM when only the model ID is sent.
const DEFAULT_HF_VISION_MODEL =
  'Qwen/Qwen2.5-VL-3B-Instruct:featherless-ai';
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

function extractHuggingFaceText(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('')
      .trim();
  }

  return '';
}

async function requestHuggingFaceVision({ token, question, image }) {
  const aiResponse = await fetch(
    'https://router.huggingface.co/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.HF_VISION_MODEL || DEFAULT_HF_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: question },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.2,
        stream: false,
      }),
    }
  );
  const data = await aiResponse.json().catch(() => ({}));

  return {
    ok: aiResponse.ok,
    status: aiResponse.status,
    text: extractHuggingFaceText(data),
  };
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
  const huggingFaceToken = process.env.HF_TOKEN;
  if (!apiKey && !huggingFaceToken) {
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

  if (apiKey) {
    const models = visionModels();

    for (const model of models) {
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
            return response.status(200).json({ text, provider: 'gemini' });
          }
          console.error('Gemini vision returned an empty response', model);
        } else {
          console.error('Gemini vision error', model, aiResponse.status);
          if (!RETRYABLE_STATUSES.has(aiResponse.status)) break;
        }
      } catch (error) {
        console.error('ELL-EX Gemini vision request error', model, error);
      }
    }
  }

  if (huggingFaceToken) {
    try {
      const result = await requestHuggingFaceVision({
        token: huggingFaceToken,
        question,
        image,
      });

      if (result.ok && result.text) {
        return response.status(200).json({
          text: result.text,
          provider: 'huggingface',
        });
      }

      console.error('Hugging Face vision error', result.status);
      if (result.status === 402) {
        return response.status(402).json({
          error: 'ELL-EX Vision needs provider credit before it can analyse photos.',
          code: 'VISION_CREDITS_EXHAUSTED',
        });
      }
      if (result.status === 401 || result.status === 403) {
        return response.status(503).json({
          error: 'ELL-EX Vision could not authenticate with its provider.',
          code: 'VISION_AUTHENTICATION_FAILED',
        });
      }
    } catch (error) {
      console.error('ELL-EX Hugging Face vision request error', error);
    }
  }

  return response.status(503).json({
    error: 'ELL-EX Vision is temporarily busy. Please try again in a moment.',
    code: 'VISION_TEMPORARILY_UNAVAILABLE',
  });
}
