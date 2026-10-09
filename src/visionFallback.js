const ZERO_CREDIT_VISION_CODES = new Set([
  'VISION_CREDITS_EXHAUSTED',
  'VISION_NOT_CONFIGURED',
  'VISION_AUTHENTICATION_FAILED',
]);

function describeColour(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const spread = maximum - minimum;

  if (maximum < 55) return 'near-black';
  if (minimum > 210 && spread < 28) return 'near-white';
  if (spread < 24) return 'neutral grey';
  if (red > green * 1.28 && red > blue * 1.28) return 'red';
  if (green > red * 1.22 && green > blue * 1.18) return 'green';
  if (blue > red * 1.2 && blue > green * 1.15) return 'blue';
  if (red > 135 && green > 95 && blue < 105) return 'gold or warm yellow';
  if (red > 130 && blue > 120 && green < Math.min(red, blue) * 0.82) {
    return 'purple';
  }
  if (green > 105 && blue > 110 && red < Math.min(green, blue) * 0.85) {
    return 'teal or cyan';
  }
  return 'mixed colour';
}

function describeBrightness(luminance) {
  if (luminance < 55) return 'very dark';
  if (luminance < 105) return 'mostly dark';
  if (luminance > 205) return 'mostly bright';
  if (luminance > 155) return 'fairly bright';
  return 'mid-tone';
}

export function analyseLocalImage(width, height, pixels = []) {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  let darkest = 255;
  let lightest = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    if ((pixels[index + 3] ?? 255) < 32) continue;
    const r = pixels[index] || 0;
    const g = pixels[index + 1] || 0;
    const b = pixels[index + 2] || 0;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    red += r;
    green += g;
    blue += b;
    darkest = Math.min(darkest, luminance);
    lightest = Math.max(lightest, luminance);
    count += 1;
  }

  const average = count
    ? { red: red / count, green: green / count, blue: blue / count }
    : { red: 0, green: 0, blue: 0 };
  const luminance =
    0.2126 * average.red + 0.7152 * average.green + 0.0722 * average.blue;
  const orientation = width === height ? 'square' : width > height ? 'landscape' : 'portrait';
  const contrastRange = lightest - darkest;

  return {
    width,
    height,
    orientation,
    tone: describeBrightness(luminance),
    averageColour: describeColour(average.red, average.green, average.blue),
    contrast: contrastRange > 165 ? 'high' : contrastRange > 85 ? 'medium' : 'low',
  };
}

export function shouldUseZeroCreditVisionFallback(code = '') {
  return ZERO_CREDIT_VISION_CODES.has(code);
}

export function createZeroCreditVisionSummary(
  question = '',
  photo = {},
  reason = 'VISION_CREDITS_EXHAUSTED'
) {
  const details = photo.localDetails || {};
  const points = [
    photo.name ? `File: ${photo.name}` : '',
    details.width && details.height
      ? `Size: ${details.width} × ${details.height} pixels (${details.orientation})`
      : '',
    details.tone && details.averageColour
      ? `Overall appearance: ${details.tone}, with an average ${details.averageColour} tone`
      : '',
    details.contrast ? `Contrast: ${details.contrast}` : '',
  ].filter(Boolean);

  return {
    title: 'Local photo check ready',
    body:
      'ELL-EX checked this image on your device without using provider credit. ' +
      'It can report basic visual properties, but reliable objects, faces, scenes, and text recognition still needs a connected Vision provider.',
    points,
    suggestions: [],
    live: false,
    label: 'ZERO-CREDIT VISION',
    mode: 'Ask',
    reason,
    question,
  };
}
