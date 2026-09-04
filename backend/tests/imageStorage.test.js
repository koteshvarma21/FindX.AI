const test = require('node:test');
const assert = require('node:assert/strict');

const { ImageStorageError, isSafeImageUrl, storeDataUrl } = require('../services/imageStorage');

test('invalid image data is classified as a client error', async () => {
  await assert.rejects(() => storeDataUrl('data:image/png;base64,invalid'), (error) => {
    assert.equal(error instanceof ImageStorageError, true);
    assert.equal(error.statusCode, 400);
    return true;
  });
});

test('oversized image data is classified as payload too large', async () => {
  const oversized = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(10 * 1024 * 1024)]).toString('base64');
  await assert.rejects(() => storeDataUrl(`data:image/png;base64,${oversized}`), (error) => {
    assert.equal(error.statusCode, 413);
    return true;
  });
});

test('persistent image URLs reject dangerous schemes', () => {
  assert.equal(isSafeImageUrl('/uploads/item.png'), true);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageUrl('data:image/png;base64,abc'), false);
});