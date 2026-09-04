// middleware/validateLostItem.js
// Runs before the controller. Checks the request body is well-formed and
// responds with 400 + a list of errors if not, so the controller only ever
// sees valid data.

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidLatLng(lat, lng) {
  if (lat === undefined && lng === undefined) return true; // both optional
  if (lat === undefined || lng === undefined) return false;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return (
    !Number.isNaN(latNum) &&
    !Number.isNaN(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180
  );
}

function isSafeImageUrl(value) {
  if (typeof value !== 'string') return false;
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;
  if (!/^https:\/\//i.test(value)) return false;
  const trustedOrigins = (process.env.TRUSTED_IMAGE_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  try { return trustedOrigins.includes(new URL(value).origin); } catch (_error) { return false; }
}

function validateLostItem(req, res, next) {
  const body = req.body;
  const errors = [];

  if (!req.userId) errors.push('An authenticated user is required.');

  if (body.unique_features !== undefined && !Array.isArray(body.unique_features)) {
    errors.push('unique_features must be an array of strings.');
  }
  if (Array.isArray(body.unique_features) && (body.unique_features.length > 20 || body.unique_features.some((feature) => typeof feature !== 'string' || feature.trim().length > 250))) errors.push('unique_features must contain at most 20 strings of 250 characters.');

  // Must have SOME way to identify the item: a description (for AI image-gen) or an uploaded image.
  const hasDescription = isNonEmptyString(body.description);
  const hasImage = isNonEmptyString(body.original_image_url);
  if (!hasDescription && !hasImage) {
    errors.push('Either "description" or "original_image_url" must be provided.');
  }

  if (!isNonEmptyString(body.last_seen_location)) {
    errors.push('last_seen_location is required.');
  }
  if (body.original_image_url !== undefined && !isSafeImageUrl(body.original_image_url)) errors.push('original_image_url must be an application-managed image URL.');
  if (body.ai_generated_image_url !== undefined && !isSafeImageUrl(body.ai_generated_image_url)) errors.push('ai_generated_image_url must be an application-managed image URL.');

  if (!isValidLatLng(body.last_seen_lat, body.last_seen_lng)) {
    errors.push('last_seen_lat/last_seen_lng must both be valid coordinates if provided.');
  }

  if (body.last_seen_at && Number.isNaN(Date.parse(body.last_seen_at))) {
    errors.push('last_seen_at must be a valid date/time string (e.g. ISO 8601).');
  }
  if (body.discovered_lost_at && Number.isNaN(Date.parse(body.discovered_lost_at))) {
    errors.push('discovered_lost_at must be a valid date/time string (e.g. ISO 8601).');
  }

  if (body.travel_path !== undefined && !Array.isArray(body.travel_path)) {
    errors.push('travel_path must be an array of { location, time } stops.');
  }
  if (Array.isArray(body.travel_path) && (body.travel_path.length > 30 || body.travel_path.some((stop) => !stop || typeof stop.location !== 'string' || !stop.location.trim() || stop.location.length > 500))) errors.push('travel_path contains an invalid stop.');

  if (
    body.user_confidence_score !== undefined &&
    (Number.isNaN(Number(body.user_confidence_score)) ||
      Number(body.user_confidence_score) < 0 ||
      Number(body.user_confidence_score) > 100)
  ) {
    errors.push('user_confidence_score must be a number between 0 and 100.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

module.exports = { validateLostItem };
