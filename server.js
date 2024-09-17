require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const Router = require('./routes/routes');
const AuthRouter = require('./routes/authRoutes');
const notFound = require('./middlewares/not-found');
const verifyJWT = require('./middlewares/verifyJWT');
const ErrorHandlerMiddleware = require('./middlewares/errorHandler');
const corsOptions = require('./config/corsOptions');

const server = express();

server.use(cors(corsOptions));
server.use(cookieParser());
server.use(express.json());

// Routes
server.use('/api', express.static('public')); // Including public folder for images path
server.use('/api', AuthRouter); // Login and register
server.use('/api', verifyJWT); //Verify the jwt
server.use('/api', Router); // Remaining routes

server.use(notFound); // Handling none existing routes
server.use(ErrorHandlerMiddleware); // Error handler

// running server
server.listen(process.env.PORT, () => {
  console.log('running on port ' + process.env.PORT);
});
