import test from 'node:test';
import assert from 'node:assert/strict';
import { createZeroCreditCreativeBrief, inferCreativeType, shouldUseZeroCreditFallback } from '../src/creativeFallback.js';

test('selects a phone-safe app direction from the request', () => {
  const type = inferCreativeType('Design a mobile app for community support');

  assert.equal(type.id, 'app');
  assert.match(type.layout, /normal phone/i);
});

test('creates a useful brief when image credits are exhausted', () => {
  const result = createZeroCreditCreativeBrief('Create a blue and gold poster for ELL-EX');

  assert.equal(result.label, 'ZERO-CREDIT STUDIO');
  assert.equal(result.mode, 'Create');
  assert.equal(result.complete, true);
  assert.match(result.body, /blue and gold poster for ELL-EX/);
  assert.match(result.body, /No image-generation credit was used|zero-credit mode/);
  assert.deepEqual(result.suggestions, []);
});

test('explains a missing image connection without claiming credits were spent', () => {
  const result = createZeroCreditCreativeBrief('Make a logo', 'IMAGE_NOT_CONFIGURED');

  assert.match(result.body, /not connected right now/i);
  assert.match(result.title, /Logo direction/);
});

test('uses the fallback only for credit and configuration failures', () => {
  assert.equal(shouldUseZeroCreditFallback('IMAGE_CREDITS_EXHAUSTED'), true);
  assert.equal(shouldUseZeroCreditFallback('IMAGE_NOT_CONFIGURED'), true);
  assert.equal(shouldUseZeroCreditFallback('IMAGE_PROVIDER_RATE_LIMITED'), false);
  assert.equal(shouldUseZeroCreditFallback('IMAGE_PROVIDER_UNAVAILABLE'), false);
});
