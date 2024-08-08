const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const isValidUUIDV4 = require('../util/uuidV4Regex');
const asyncWrapper = require('../middlewares/async');
const { createCustomError } = require('../errors/custom-error');
const { BlogsPaginationProps, BlogInsertionProps, SearchQueries } = require('../util/zod');

const insertABlog = asyncWrapper(async (req, res, next) => {
  const { title, userId, categoryId, body } = req.body;

  const validatedData = BlogInsertionProps.safeParse({
    title,
    userId,
    categoryId,
    body,
  });

  if (!validatedData.success)
    return next(createCustomError('Invalid data', 400));

  const { rows } = await pool.query(
    'INSERT INTO blogs (id, title, userId, body, imagePath, categoryId) VALUES($1, $2, $3, $4, $5, $6) RETURNING id, title, userId, body, imagePath, categoryId',
    [uuidv4(), validatedData.data.title, validatedData.data.userId, validatedData.data.body, req.file ? req.file.path : null, validatedData.data.categoryId]
  );
  if (rows.length === 0)
    return next(createCustomError('failed insertion, try again', 500));

  res.status(201).json({
    success: true,
    message: 'Blog post created successfully',
    post: rows[0], // Respond with the inserted post details
  });
});

const getBlogs = asyncWrapper(async (req, res, next) => {
  const { categoryId, page, limit } = req.query;

  const validatedProps = BlogsPaginationProps.safeParse({
    categoryId,
    page,
    limit,
  });
  if (!validatedProps.success)
    return next(createCustomError('Invalid queries', 401));

  const currentPage = parseInt(validatedProps.data.page) || 1;
  const BlogLimit = parseInt(validatedProps.data.limit) || 6;
  const offset = (currentPage - 1) * BlogLimit;

  const q = categoryId
    ? 'SELECT * FROM blogs WHERE categoryid = $1  ORDER BY created_at LIMIT $2 OFFSET $3'
    : 'SELECT * FROM blogs ORDER BY created_at LIMIT $1 OFFSET $2';
  const values = categoryId
    ? [validatedProps.data.categoryId, BlogLimit, offset]
    : [BlogLimit, offset];

  const { rows } = await pool.query(q, values);
  if (rows.length === 0)
    return next(createCustomError("Couldn't find the intended blogs", 404));

  const countQ = categoryId
    ? 'SELECT COUNT(*) FROM blogs WHERE categoryid = $1'
    : 'SELECT COUNT(*) FROM blogs';
  const countValues = categoryId ? [validatedProps.data.categoryId] : [];

  const countRequest = await pool.query(countQ, countValues);
  const totalCount = parseInt(countRequest.rows[0].count);

  const hasNextPage = totalCount > currentPage * BlogLimit;
  const hasPrevPage = currentPage > 1;
  
  res.json({
    success: true,
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



const getSearchedBlogs = asyncWrapper(async (req, res, next) => {
  const { query, page, limit } = req.query;
  const ValidatedQueries = SearchQueries.safeParse({ query, page, limit });
  if (!ValidatedQueries.success)
    return next(createCustomError('Invalid Query', 400));

  const currentPage = parseInt(ValidatedQueries.data.page) || 1;
  const blogLimit = parseInt(ValidatedQueries.data.limit) || 6;
  const offset = (currentPage - 1) * blogLimit;

  const { rows } = await pool.query(
    'SELECT b.* FROM blogs b JOIN users u ON u.id = b.userId WHERE b.title ILIKE $1 OR u.username ILIKE $1 LIMIT $2 OFFSET $3',
    [`%${query}%`, blogLimit, offset]
  );

  if (rows.length === 0)
    return next(createCustomError('Could not find the blog', 404));

  const countRequest = await pool.query(
    'SELECT COUNT(*) FROM blogs b JOIN users u ON u.id = b.userId WHERE b.title ILIKE $1 OR u.username ILIKE $1',
    [`%${query}%`]
  );

  const totalCount = parseInt(countRequest.rows[0].count);
  const hasNextPage = totalCount > currentPage * blogLimit;
  const hasPrevPage = currentPage > 1;

  res.json({
    success: true,
    blogs: rows,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null,
  });
});

module.exports = {
  insertABlog,
  getBlogs,
  getSingleBlog,
  getSearchedBlogs,
};
