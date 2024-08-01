const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const isValidUUIDV4 = require('../util/uuidV4Regex');
const asyncWrapper = require('../middlewares/async');
const { createCustomError } = require('../errors/custom-error');

const BlogInsertionProps = z.object({
  title: z.string().trim().min(3),
  userId: z.string().trim().min(36),
  userId: z.string().trim().min(3),
  categoryId: z.coerce.number().nullable(),
});

const insertABlog = asyncWrapper(async (req, res, next) => {
  const { title, userId, categoryId, body } = req.body;

  const { rows } = await pool.query(
    'INSERT INTO blogs (id, title, userId, body, imagePath, categoryId) VALUES($1, $2, $3, $4, $5, $6) RETURNING id, title, userId, body, imagePath, categoryId',
    [uuidv4(), title, userId, body, req.file ? req.file.path : null, categoryId]
  );
  if (rows.length === 0)
    return next(createCustomError('failed insertion, try again', 500));

  res.status(201).json({
    success: true,
    message: 'Blog post created successfully',
    post: rows[0], // Respond with the inserted post details
  });
});

const BlogsPaginationProps = z.object({
  categoryId: z.coerce.number().nullable(),
  page: z.coerce.number(),
});

const getBlogs = asyncWrapper(async (req, res, next) => {
  const { categoryId, page } = req.query;

  const validatedProps = BlogsPaginationProps.safeParse({ categoryId, page });
  if (!validatedProps.success)
    return next(createCustomError('Invalid queries', 401));

  const currentPage = parseInt(validatedProps.data.page) || 1;
  const limit = 6;
  const offset = (currentPage - 1) * limit;

  const q = categoryId
    ? 'SELECT * FROM blogs WHERE categoryid = $1  ORDER BY created_at LIMIT $2 OFFSET $3'
    : 'SELECT * FROM blogs ORDER BY created_at LIMIT $1 OFFSET $2';
  const values = categoryId
    ? [validatedProps.data.categoryId, limit, offset]
    : [limit, offset];

  const { rows } = await pool.query(q, values);
  if (rows.length === 0)
    return next(createCustomError("Couldn't find the intended blogs", 404));

  const countQ = categoryId
    ? 'SELECT COUNT(*) FROM blogs WHERE categoryid = $1'
    : 'SELECT COUNT(*) FROM blogs';
  const countValues = categoryId ? [validatedProps.data.categoryId] : [];

  const countRequest = await pool.query(countQ, countValues);
  const totalCount = countRequest.rows[0].count;

  const hasNextPage = totalCount > currentPage * limit;
  const hasPrevPage = currentPage > 1;
  console.log(rows);
  res.json({
    blogs: rows,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null,
  });
});

const getSingleBlog = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  if (!id || !isValidUUIDV4(id))
    return next(createCustomError(`Invalid params`, 400));

  const { rows } = await pool.query(
    `SELECT b.id, b.title, b.userId, b.body,
    b.imagePath AS blogImagePath, b.categoryId,
    b.created_at, u.username, u.imagePath AS userImagePath,
    c.name AS categoryName FROM blogs b JOIN users u ON b.userId = u.id
    LEFT JOIN categories c ON b.categoryId = c.id WHERE b.id = $1`,
    [id]
  );
  if (rows.length === 0)
    return next(createCustomError('Could not find the intended blog'), 404);

  res.json({ success: true, blog: rows[0] });
});

module.exports = {
  insertABlog,
  getBlogs,
  getSingleBlog,
};
