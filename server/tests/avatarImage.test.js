const crypto = require('node:crypto');
const sharp = require('sharp');
const { compressAvatar } = require('../utils/avatarImage');

describe('avatar compression', () => {
  test('turns a large noisy image into a small, correctly sized WebP', async () => {
    const pixels = crypto.randomBytes(1200 * 1200 * 3);
    const source = await sharp(pixels, { raw: { width: 1200, height: 1200, channels: 3 } }).png().toBuffer();
    const result = await compressAvatar(source);
    const meta = await sharp(result.buffer).metadata();
    expect(result.buffer.length).toBeLessThanOrEqual(50 * 1024);
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(256);
    expect(meta.width).toBe(result.width);
    expect(meta.height).toBe(result.height);
  });
});
