const Router = require('express').Router();
const multer = require('multer');
const controller = require('../controllers/blogs');
const userController = require('../controllers/users');
const { fileFilter, multerConfig } = require('../util/MulterConfig');


const storage = multerConfig(multer, 'public/images/blogs');
const upload = multer({ storage, limits: { fileSize: 1000000 }, fileFilter });

// Blogs
Router.post('/blogs', upload.single('image'), controller.insertABlog); // Post a blog
Router.put('/blogs/:id', upload.single('image'), controller.editBlog); // Edit a blog
Router.get('/blogs/:id', controller.getSingleBlog); // Get a single blog
Router.get('/blogs', controller.getBlogs); // Get all blogs

// Users
Router.get('/users/:id', userController.getSingleUser); // Get user Info
Router.get('/users/blogs/:id', userController.getAllBlogsOfUser); // Get user blogs

// Search
Router.get('/search', controller.getSearchedBlogs); // search for a blog using title or author

module.exports = Router;
