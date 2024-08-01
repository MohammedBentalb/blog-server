const multer = require('multer');
const AuthRouter = require('express').Router();
const authController = require('../controllers/auth');
const { multerConfig, fileFilter } = require('../util/MulterConfig');

const storage = multerConfig(multer, 'public/images/personal');
const upload = multer({ storage, limits: { fileSize: 1000000 }, fileFilter });

// authentication
AuthRouter.post('/login', authController.login);
AuthRouter.post('/logout', authController.logout);
AuthRouter.post('/register', upload.single('image'), authController.register);
AuthRouter.post('/refresh', authController.refresh);

module.exports = AuthRouter;
