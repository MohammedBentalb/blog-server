const { createCustomError } = require('../errors/custom-error');

const multerConfig = (multer, imgPath) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imgPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  });
  return storage;
};

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true); // Accept the file
  } else {
    cb(createCustomError('Invalid file format', 401));
  }
};

module.exports = {
  fileFilter,
  multerConfig,
};
