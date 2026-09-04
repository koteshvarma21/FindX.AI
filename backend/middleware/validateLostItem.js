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

function validateLostItem(req, res, next) {
  const body = req.body;
  const errors = [];

  if (!isValidEmail(body.contact_email)) {
    errors.push('contact_email is required and must be a valid email address.');
  }

  // Must have SOME way to identify the item: a description (for AI image-gen) or an uploaded image.
  const hasDescription = isNonEmptyString(body.description);
  const hasImage = isNonEmptyString(body.original_image_url);
  if (!hasDescription && !hasImage) {
    errors.push('Either "description" or "original_image_url" must be provided.');
  }

  if (!isNonEmptyString(body.last_seen_location)) {
    errors.push('last_seen_location is required.');
  }

  if (!isValidLatLng(body.last_seen_lat, body.last_seen_lng)) {
    errors.push('last_seen_lat/last_seen_lng must both be valid coordinates if provided.');
  }

  if (body.discovered_lost_at && Number.isNaN(Date.parse(body.discovered_lost_at))) {
    errors.push('discovered_lost_at must be a valid date/time string (e.g. ISO 8601).');
  }

  if (body.travel_path !== undefined && !Array.isArray(body.travel_path)) {
    errors.push('travel_path must be an array of { location, time } stops.');
  }

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
