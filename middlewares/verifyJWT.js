require('dotenv').config();
const jwt = require('jsonwebtoken');

const pool = require('../database/db');
const asyncWrapper = require('./async');
const { createCustomError } = require('../errors/custom-error');

const verifyJWT = asyncWrapper(async (req, res, next) => {
  const authHeader =
    req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return next(createCustomError('Unauthorized', 401));
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_TOKEN, async (err, decoded) => {
    if (err || !decoded || !decoded.email)
      return next(createCustomError('Unauthorized', 401));
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
      decoded.email,
    ]);
    if (rows.length === 0 || rows[0].email !== decoded.email)
      return next(createCustomError('Unauthorized', 401));
    next();
  });
});

module.exports = verifyJWT;
