const MAX_IMAGE_LENGTH = 11_000_000;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const question = typeof request.body?.question === 'string'
    ? request.body.question.trim().slice(0, 1200)
    : 'Describe this image clearly.';
  const image = typeof request.body?.image === 'string' ? request.body.image : '';

  if (!image.startsWith('data:image/') || image.length > MAX_IMAGE_LENGTH) {
    return response.status(400).json({ error: 'Please choose a valid image under 8 MB.' });
  }

  const token = process.env.HF_TOKEN;
  if (!token) return response.status(503).json({ error: 'ELL-EX AI is not configured yet.' });

  try {
    const aiResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-VL-3B-Instruct:featherless-ai',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: question || 'Describe this image clearly and identify useful details.' },
            { type: 'image_url', image_url: { url: image } }
          ]
        }],
        max_tokens: 400,
        stream: false
      })
    });
    const data = await aiResponse.json();
    if (!aiResponse.ok) {
      console.error('Hugging Face vision error', aiResponse.status, data?.error?.message || data?.error || data);
      const providerMessage = data?.error?.message || data?.error;
      return response.status(502).json({
        error: typeof providerMessage === 'string'
          ? `Vision provider error: ${providerMessage.slice(0, 180)}`
          : 'The vision service is temporarily unavailable.'
      });
    }
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return response.status(502).json({ error: 'ELL-EX Vision returned an empty response.' });
    return response.status(200).json({ text });
  } catch (error) {
    console.error('ELL-EX vision error', error);
    return response.status(500).json({ error: 'ELL-EX could not analyse that image.' });
  }
}
