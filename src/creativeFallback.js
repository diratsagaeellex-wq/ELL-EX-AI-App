const CREATIVE_TYPES = [
  {
    id: 'logo',
    keywords: ['logo', 'brand mark', 'emblem', 'monogram'],
    title: 'Logo direction',
    format: 'a distinctive logo',
    layout: 'Use one memorable symbol with a clear wordmark. Keep the silhouette simple enough to work as a small app icon and in one colour.',
  },
  {
    id: 'poster',
    keywords: ['poster', 'flyer', 'invitation', 'cover'],
    title: 'Poster direction',
    format: 'a polished poster',
    layout: 'Build a clear top-to-bottom hierarchy: strong headline, one focal visual, short supporting copy, then the call to action or event details.',
  },
  {
    id: 'app',
    keywords: ['app', 'screen', 'interface', 'dashboard', 'mobile'],
    title: 'App-screen direction',
    format: 'a mobile-first app screen',
    layout: 'Focus the screen on one primary task, use large touch targets, readable text, and a layout that fits a normal phone without horizontal scrolling.',
  },
  {
    id: 'website',
    keywords: ['website', 'web page', 'landing page', 'homepage'],
    title: 'Website direction',
    format: 'a responsive website concept',
    layout: 'Lead with the main promise and one action, then organise supporting information into a simple reading flow that remains clear on mobile.',
  },
  {
    id: 'social',
    keywords: ['social', 'instagram', 'facebook', 'tiktok', 'post'],
    title: 'Social graphic direction',
    format: 'a scroll-stopping social graphic',
    layout: 'Use one focal message, generous safe margins, strong contrast, and minimal supporting text so the idea remains readable on a phone.',
  },
  {
    id: 'card',
    keywords: ['business card', 'card'],
    title: 'Business-card direction',
    format: 'a professional business card',
    layout: 'Keep the front brand-led and the contact side highly readable. Use restrained spacing and avoid placing important information near the trim edge.',
  },
];

const DEFAULT_TYPE = {
  id: 'concept',
  title: 'Creative direction',
  format: 'a focused visual concept',
  layout: 'Use one clear focal point, an intentional reading order, strong contrast, and only the details needed to communicate the idea.',
};

function cleanPrompt(prompt = '') {
  return String(prompt).replace(/\s+/g, ' ').trim().slice(0, 1000);
}

export function inferCreativeType(prompt = '') {
  const normalized = cleanPrompt(prompt).toLowerCase();
  return CREATIVE_TYPES.find(type => type.keywords.some(keyword => normalized.includes(keyword))) || DEFAULT_TYPE;
}

export function shouldUseZeroCreditFallback(code = '') {
  return code === 'IMAGE_CREDITS_EXHAUSTED' || code === 'IMAGE_NOT_CONFIGURED';
}

export function createZeroCreditCreativeBrief(prompt = '', reason = 'IMAGE_CREDITS_EXHAUSTED') {
  const request = cleanPrompt(prompt) || 'Create a clear, professional visual';
  const type = inferCreativeType(request);
  const unavailableCopy = reason === 'IMAGE_NOT_CONFIGURED'
    ? 'Image generation is not connected right now.'
    : 'Image generation needs provider credit right now.';
  const productionPrompt = `Create ${type.format} for this request: “${request}” ${type.layout} Respect every name, colour, message, and requirement stated by the user. Make the result clean, original, professional, and easy to understand on a phone.`;

  return {
    title: `${type.title} ready`,
    body: [
      `**ELL-EX kept Create working in zero-credit mode.** ${unavailableCopy} Instead of stopping, ELL-EX prepared a practical direction you can copy and use when image creation becomes available.`,
      `### Your request\n${request}`,
      `### Recommended layout\n${type.layout}`,
      `### Ready-to-use production prompt\n${productionPrompt}`,
      '### Build checklist\n1. Confirm the exact wording and names.\n2. Keep the main message readable at phone size.\n3. Check spacing, contrast, spelling, and alignment.\n4. Export a high-quality final version and a lightweight mobile version.',
    ].join('\n\n'),
    points: [
      'No image-generation credit was used',
      'Your original request was preserved',
      'The direction is ready to copy or save',
    ],
    suggestions: [],
    live: false,
    label: 'ZERO-CREDIT STUDIO',
    mode: 'Create',
    complete: true,
  };
}
