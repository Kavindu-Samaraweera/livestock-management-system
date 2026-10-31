const notFound = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

const errorHandler = (error, req, res, next) => {
  console.error(error.stack || error.message);

  if (res.headersSent) return next(error);

  if (error.name === 'ValidationError') {
    const errors = Object.fromEntries(
      Object.entries(error.errors || {}).map(([field, fieldError]) => [field, fieldError.message])
    );
    return res.status(400).json({
      message: 'Request validation failed.',
      errors
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid request data.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'A resource with these values already exists.' });
  }

  const statusCode = Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500
    ? error.statusCode
    : 500;

  return res.status(statusCode).json({
    message: statusCode < 500 ? 'The request could not be processed.' : 'Internal server error.'
  });
};

module.exports = { notFound, errorHandler };
