// middleware/errorHandler.js
// Catches anything thrown/rejected in a route that wasn't handled locally,
// so the API always responds with clean JSON instead of crashing or hanging.

function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, errors: ['Internal server error.'] });
}

module.exports = { errorHandler };
