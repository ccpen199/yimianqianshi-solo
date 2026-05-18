const successResponse = (res, data = null, message = 'success') => {
  res.json({
    success: true,
    data,
    message
  });
};

const errorResponse = (res, message = 'error', status = 500, errors = null) => {
  res.status(status).json({
    success: false,
    data: null,
    message,
    errors
  });
};

module.exports = {
  successResponse,
  errorResponse
};