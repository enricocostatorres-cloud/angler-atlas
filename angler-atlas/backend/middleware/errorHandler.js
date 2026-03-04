const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  const status = err.status || 500;
  res.status(status).json({ error: status < 500 ? err.message : 'Internal server error' });
};

module.exports = errorHandler;
