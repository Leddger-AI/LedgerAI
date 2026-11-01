const sharp = require('sharp');

async function compressAvatar(buffer, maxBytes = 50 * 1024, maxDimension = 256) {
  const meta = await sharp(buffer).metadata();
  const sourceDimension = Math.max(meta.width || maxDimension, meta.height || maxDimension);
  const firstDimension = Math.min(maxDimension, sourceDimension);
  const dimensions = [...new Set([
    firstDimension,
    Math.min(firstDimension, 192),
    Math.min(firstDimension, 144),
    Math.min(firstDimension, 112),
  ])];

  let output;
  let width = firstDimension;
  let quality = 82;
  for (const dimension of dimensions) {
    width = dimension;
    output = await sharp(buffer).rotate().resize(dimension, dimension, { fit: 'cover' })
      .webp({ quality, effort: 2 }).toBuffer();
    if (output.length <= maxBytes) break;
  }

  while (output.length > maxBytes && quality > 50) {
    quality -= 10;
    output = await sharp(buffer).rotate().resize(width, width, { fit: 'cover' })
      .webp({ quality, effort: 2 }).toBuffer();
  }

  return { buffer: output, width, height: width, quality };
}

module.exports = { compressAvatar };
