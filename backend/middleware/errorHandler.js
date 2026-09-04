// middleware/errorHandler.js
// Catches anything thrown/rejected in a route that wasn't handled locally,
// so the API always responds with clean JSON instead of crashing or hanging.

function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, errors: ['Request payload is too large.'] });
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ success: false, errors: ['Malformed JSON request.'] });
  if (err.name === 'ValidationError') return res.status(400).json({ success: false, errors: Object.values(err.errors).map((error) => error.message) });
  if (err.name === 'CastError') return res.status(400).json({ success: false, errors: ['Invalid identifier.'] });
  if (err.code === 11000) return res.status(409).json({ success: false, errors: ['A record with those values already exists.'] });
  res.status(500).json({ success: false, errors: ['Internal server error.'] });
}

module.exports = { errorHandler };
