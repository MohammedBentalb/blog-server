const { createCustomError } = require('../errors/custom-error');

const allowedOrigins = ['http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(createCustomError('NOT ALLOWED BY CORS', 400));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
