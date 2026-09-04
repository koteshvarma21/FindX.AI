const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const uploadDirectory = path.join(__dirname, '..', 'uploads');

class ImageStorageError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isSafeImageUrl(value) {
  const stringValue = String(value || '');
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(stringValue)) return true;
  if (!/^https:\/\//i.test(stringValue)) return false;
  const trustedOrigins = (process.env.TRUSTED_IMAGE_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  try { return trustedOrigins.includes(new URL(stringValue).origin); } catch (_error) { return false; }
}

async function storeDataUrl(dataUrl) {
  if (isSafeImageUrl(dataUrl)) {
    return dataUrl;
  }
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new ImageStorageError('A valid JPEG, PNG, or WEBP data URL is required', 400);

  const extension = match[1] === 'image/jpeg' || match[1] === 'image/jpg' ? 'jpg' : match[1].split('/')[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new ImageStorageError('Image data is empty', 400);
  if (buffer.length > 10 * 1024 * 1024) throw new ImageStorageError('Image must not exceed 10 MB', 413);
  const isPng = match[1] === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = (match[1] === 'image/jpeg' || match[1] === 'image/jpg') && buffer[0] === 255 && buffer[1] === 216 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217;
  const isWebp = match[1] === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  if (!isPng && !isJpeg && !isWebp) throw new ImageStorageError('Image data does not match its MIME type', 400);
  await fs.mkdir(uploadDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(uploadDirectory, filename), buffer);
  return `/uploads/${filename}`;
}

module.exports = { ImageStorageError, isSafeImageUrl, storeDataUrl, uploadDirectory };
