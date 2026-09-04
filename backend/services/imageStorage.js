const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const uploadDirectory = path.join(__dirname, '..', 'uploads');

async function storeDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) return dataUrl;

  const extension = match[1] === 'image/jpeg' || match[1] === 'image/jpg' ? 'jpg' : match[1].split('/')[1];
  await fs.mkdir(uploadDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(uploadDirectory, filename), Buffer.from(match[2], 'base64'));
  return `/uploads/${filename}`;
}

module.exports = { storeDataUrl, uploadDirectory };
