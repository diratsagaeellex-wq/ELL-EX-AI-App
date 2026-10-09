import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyseLocalImage,
  createZeroCreditVisionSummary,
  shouldUseZeroCreditVisionFallback,
} from '../src/visionFallback.js';

test('analyses basic image properties without a provider', () => {
  const pixels = new Uint8ClampedArray([
    5, 10, 30, 255,
    240, 200, 40, 255,
    5, 10, 30, 255,
    240, 200, 40, 255,
  ]);

  const result = analyseLocalImage(1080, 1920, pixels);

  assert.equal(result.orientation, 'portrait');
  assert.equal(result.width, 1080);
  assert.equal(result.height, 1920);
  assert.equal(result.contrast, 'high');
});

test('creates an honest zero-credit Vision response', () => {
  const answer = createZeroCreditVisionSummary(
    'What can you see?',
    {
      name: 'photo.jpg',
      localDetails: {
        width: 1080,
        height: 1920,
        orientation: 'portrait',
        tone: 'mostly dark',
        averageColour: 'blue',
        contrast: 'high',
      },
    }
  );

  assert.equal(answer.title, 'Local photo check ready');
  assert.equal(answer.label, 'ZERO-CREDIT VISION');
  assert.match(answer.body, /without using provider credit/i);
  assert.deepEqual(answer.points, [
    'File: photo.jpg',
    'Size: 1080 × 1920 pixels (portrait)',
    'Overall appearance: mostly dark, with an average blue tone',
    'Contrast: high',
  ]);
});

test('uses the local fallback only for unavailable paid Vision access', () => {
  assert.equal(shouldUseZeroCreditVisionFallback('VISION_CREDITS_EXHAUSTED'), true);
  assert.equal(shouldUseZeroCreditVisionFallback('VISION_NOT_CONFIGURED'), true);
  assert.equal(shouldUseZeroCreditVisionFallback('VISION_AUTHENTICATION_FAILED'), true);
  assert.equal(shouldUseZeroCreditVisionFallback('VISION_TEMPORARILY_UNAVAILABLE'), false);
});
