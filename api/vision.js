const MAX_IMAGE_LENGTH = 11_000_000;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const question =
    typeof request.body?.question === 'string'
      ? request.body.question.trim().slice(0, 1200)
      : 'Describe this image clearly.';

  const image =
    typeof request.body?.image === 'string' ? request.body.image : '';

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
    return response
      .status(503)
      .json({ error: 'ELL-EX Vision is not configured yet.' });
  }

  try {
    const aiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: question },
                {
                  inline_data: {
                    mime_type: match[1],
                    data: match[2]
                  }
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 400
          }
        })
      }
    );

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error('Gemini vision error', aiResponse.status, data);
      const providerMessage = data?.error?.message;

      return response.status(502).json({
        error:
          typeof providerMessage === 'string'
            ? `Vision provider error: ${providerMessage.slice(0, 180)}`
            : 'The vision service is temporarily unavailable.'
      });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim();

    if (!text) {
      return response
        .status(502)
        .json({ error: 'ELL-EX Vision returned an empty response.' });
    }

    return response.status(200).json({ text });
  } catch (error) {
    console.error('ELL-EX vision error', error);

    return response
      .status(500)
      .json({ error: 'ELL-EX could not analyse that image.' });
  }
}