const multer = require('multer');
const Router = require('express').Router();
const controller = require('../controllers/blogs');
const userController = require('../controllers/users');
const { fileFilter, multerConfig } = require('../util/MulterConfig');
const storage = multerConfig(multer, 'public/images/blogs');

const upload = multer({ storage, limits: { fileSize: 1000000 }, fileFilter });

// Blogs
Router.post('/blogs', upload.single('image'), controller.insertABlog); // Post a blog
Router.get('/blogs/:id', controller.getSingleBlog); // Get a single blog
Router.get('/blogs', controller.getBlogs); // Get all blogs

// Users
Router.get('/users/:id', userController.getSingleUser);

module.exports = Router;
