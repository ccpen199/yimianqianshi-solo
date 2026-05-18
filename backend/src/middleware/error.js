const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  errorResponse(res, err.message || '服务器内部错误', 500);
};

const notFoundHandler = (req, res) => {
  errorResponse(res, '接口不存在', 404);
};

const timeoutHandler = (timeout = 10000) => {
  return (req, res, next) => {
    res.setTimeout(timeout, () => {
      errorResponse(res, '请求超时', 408);
    });
    next();
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  timeoutHandler
};