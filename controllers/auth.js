require('dotenv').config();
const pool = require('../database/db');
const { createCustomError } = require('../errors/custom-error');
const asyncWrapper = require('../middlewares/async');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const { z } = require('zod');

const RegistrationProps = z.object({
  username: z.string().trim().min(3),
  email: z.string().email(),
  password: z.string().trim().min(8),
});

const register = asyncWrapper(async (req, res, next) => {
  const { username, email, password } = req.body;
  // validating the data
  const validatedData = RegistrationProps.safeParse({
    username,
    email,
    password,
  });

  if (!validatedData.success) {
    if (req.file) await fs.unlink(`${req.file.path}`);
    return next(createCustomError('Invalid credentials', 400));
  }

  // find if user already exists
  const foundUser = await pool.query('SELECT * FROM users WHERE email = $1', [
    validatedData.data.email,
  ]);
  if (foundUser.rows.length > 0) {
    if (req.file) await fs.unlink(`${req.file.path}`);
    return next(createCustomError('User already exists', 409));
  }

  const hashedPassword = await bcrypt.hash(validatedData.data.password, 10);
  const token = jwt.sign(
    { email: validatedData.data.email },
    process.env.JWT_TOKEN,
    {
      expiresIn: '15min',
    }
  );
  const refreshToken = jwt.sign(
    { email: validatedData.data.email },
    process.env.JWT_REFRESH_TOKEN,
    {
      expiresIn: '3d',
    }
  );
  const { rows } = await pool.query(
    'INSERT INTO users(id, username, email, password, imagePath, refreshToken) VALUES($1, $2, $3, $4, $5, $6) RETURNING id, username, email, password, imagePath',
    [
      uuidv4(),
      validatedData.data.username,
      validatedData.data.email,
      hashedPassword,
      req.file ? req.file.path : null,
      refreshToken,
    ]
  );
  if (rows.length === 0)
    return next(createCustomError('internal server Error try again', 500));
  res.cookie('jwt', refreshToken, {
    secure: true,
    httpOnly: true,
    maxAge: 3 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
  });
  res.json({ success: true, data: rows[0] });
});

const LoginProps = z.object({
  password: z.string().trim().min(8),
  email: z.string().email(),
});

const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;
  // validating the data
  const validatedData = LoginProps.safeParse({ email, password });
  if (!validatedData.success)
    return next(createCustomError('Invalid credentials', 401));

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
    validatedData.data.email,
  ]);
  if (rows.length === 0) return next(createCustomError('Email not found', 404));
  if (!(await bcrypt.compare(validatedData.data.password, rows[0].password)))
    return next(createCustomError('Wrong email/password', 400));

  const token = jwt.sign(
    { email: validatedData.data.email },
    process.env.JWT_TOKEN,
    {
      expiresIn: '15min',
    }
  );

  const refreshToken = jwt.sign(
    { email: validatedData.data.email },
    process.env.JWT_REFRESH_TOKEN,
    {
      expiresIn: '3d',
    }
  );

  const newUser = await pool.query(
    'UPDATE users SET refreshToken = $1 WHERE email = $2 RETURNING id, username, imagePath',
    [refreshToken, validatedData.data.email]
  );

  res.cookie('jwt', refreshToken, {
    secure: true,
    sameSite: 'strict',
    httpOnly: true,
    maxAge: 3 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, token, newUser: newUser.rows[0] });
});

const refresh = asyncWrapper(async (req, res, next) => {
  const cookie = req.cookies['jwt'];
  if (!cookie) return next(createCustomError('Prohibited', 403));
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE refreshToken = $1',
    [cookie]
  );
  if (rows.length === 0 || !rows[0].refreshtoken)
    return next(createCustomError('INVALID USER', 401));
  jwt.verify(cookie, process.env.JWT_REFRESH_TOKEN, async (err, decoded) => {
    if (err || !decoded || decoded.email !== rows[0].email)
      return next(createCustomError('Unauthorized', 401));

    const token = jwt.sign(
      { email: rows[0].email },
      process.env.JWT_TOKEN,
      { expiresIn: '15min' }
    );
    
    const user = {
      username: rows[0].username,
      imagePath: rows[0].imagePath,
      email: rows[0].email,
      token,
    };

    res.json({ success: true, user });
  });
});

const logout = asyncWrapper(async (req, res, next) => {
  const cookie = req.cookies['jwt'];
  if (!cookie) return res.sendStatus(204);
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
  res.json({ success: true, message: 'cookie cleared', token: null });
});

module.exports = {
  login,
  logout,
  register,
  refresh,
};
