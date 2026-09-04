function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSafeImageUrl(value) {
  if (typeof value !== 'string') return false;
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;
  if (!/^https:\/\//i.test(value)) return false;
  const trustedOrigins = (process.env.TRUSTED_IMAGE_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  try { return trustedOrigins.includes(new URL(value).origin); } catch (_error) { return false; }
}

function validateFoundItem(req, res, next) {
  const body = req.body || {};
  const errors = [];
  if (!isNonEmpty(body.item_name)) errors.push('item_name is required.');
  if (!isNonEmpty(body.description)) errors.push('description is required.');
  if (!isNonEmpty(body.found_location)) errors.push('found_location is required.');
  if (body.image_url !== undefined && !isSafeImageUrl(body.image_url)) errors.push('image_url must be an application-managed image URL.');
  if (body.found_at && Number.isNaN(Date.parse(body.found_at))) errors.push('found_at must be a valid date/time.');
  if ((body.found_lat === undefined) !== (body.found_lng === undefined)) errors.push('found_lat and found_lng must be provided together.');
  if (body.found_lat !== undefined && (Number.isNaN(Number(body.found_lat)) || Number(body.found_lat) < -90 || Number(body.found_lat) > 90)) errors.push('found_lat must be between -90 and 90.');
  if (body.found_lng !== undefined && (Number.isNaN(Number(body.found_lng)) || Number(body.found_lng) < -180 || Number(body.found_lng) > 180)) errors.push('found_lng must be between -180 and 180.');
  if (body.unique_features !== undefined && !Array.isArray(body.unique_features)) errors.push('unique_features must be an array.');
  if (errors.length) return res.status(400).json({ success: false, errors });
  return next();
}

module.exports = { validateFoundItem };
