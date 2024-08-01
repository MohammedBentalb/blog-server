const { MulterError } = require('multer');
const { CustomAPIError } = require('../errors/custom-error');

const ErrorHandlerMiddleware = (err, req, res, next) => {
  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  if (err instanceof MulterError) {
    if (err.message !== 'File too large')
      return res.status(401).json({ message: 'Could not upload the File' });
    return res.status(401).json({ message: err.message });
  }
  console.log(err);
  return res.status(500).json({ message: 'something went wrong try again' });
};

module.exports = ErrorHandlerMiddleware;
