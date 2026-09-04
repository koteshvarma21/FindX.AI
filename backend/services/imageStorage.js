const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const uploadDirectory = path.join(__dirname, '..', 'uploads');

function isSafeImageUrl(value) {
  return /^\/uploads\/[A-Za-z0-9._-]+$/.test(String(value || '')) || /^https:\/\//i.test(String(value || ''));
}

async function storeDataUrl(dataUrl) {
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(String(dataUrl || '')) || /^https?:\/\//i.test(String(dataUrl || ''))) {
    return dataUrl;
  }
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('A valid JPEG, PNG, or WEBP data URL is required');

  const extension = match[1] === 'image/jpeg' || match[1] === 'image/jpg' ? 'jpg' : match[1].split('/')[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new Error('Image must be between 1 byte and 10 MB');
  const isPng = match[1] === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = (match[1] === 'image/jpeg' || match[1] === 'image/jpg') && buffer[0] === 255 && buffer[1] === 216 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217;
  const isWebp = match[1] === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  if (!isPng && !isJpeg && !isWebp) throw new Error('Image data does not match its MIME type');
  await fs.mkdir(uploadDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(uploadDirectory, filename), buffer);
  return `/uploads/${filename}`;
}

module.exports = { isSafeImageUrl, storeDataUrl, uploadDirectory };
