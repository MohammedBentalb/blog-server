const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const pool = require('../database/db');
const isValidUUID = require('../util/uuidV4Regex');
const asyncWrapper = require('../middlewares/async');
const { createCustomError } = require('../errors/custom-error');
const {
  BlogsPaginationProps,
  BlogInsertionProps,
  SearchQueries,
  EditBlogProps,
  CommentsProps,
} = require('../util/zod');

const insertABlog = asyncWrapper(async (req, res, next) => {
  const { title, userId, categoryId, body } = req.body;
  if (!req.file)
    return next(createCustomError('Invalid data: File is missing', 400));
  const validatedData = BlogInsertionProps.safeParse({
    title,
    userId,
    categoryId,
    body,
  });

  if (!validatedData.success) {
    if (req.file) await fs.unlink(`${req.file.path}`);
    return next(createCustomError('Invalid data', 400));
  }

  const { rows } = await pool.query(
    'INSERT INTO blogs (id, title, userId, body, blogImagePath, categoryId) VALUES($1, $2, $3, $4, $5, $6) RETURNING id, title, userId, body, blogImagePath, categoryId',
    [
      uuid(),
      validatedData.data.title,
      validatedData.data.userId,
      validatedData.data.body,
      req.file ? req.file.path : null,
      Number(validatedData.data.categoryId),
    ]
  );
  if (rows.length === 0)
    return next(createCustomError('failed insertion, try again', 500));

  res.status(201).json({
    success: true,
    message: 'Blog post created successfully',
    blog: rows[0], // Respond with the inserted post details
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
    return next(createCustomError('Invalid queries', 400));

  const currentPage = parseInt(validatedProps.data.page) || 1;
  const BlogLimit = parseInt(validatedProps.data.limit) || 6;
  const offset = (currentPage - 1) * BlogLimit;

  const q = categoryId
    ? 'SELECT * FROM blogs WHERE categoryId = $1  ORDER BY createdAt LIMIT $2 OFFSET $3'
    : 'SELECT * FROM blogs ORDER BY createdAt LIMIT $1 OFFSET $2';
  const values = categoryId
    ? [validatedProps.data.categoryId, BlogLimit, offset]
    : [BlogLimit, offset];

  const { rows } = await pool.query(q, values);
  if (rows.length === 0)
    return next(createCustomError("Couldn't find the intended blogs", 404));

  const countQ = categoryId
    ? 'SELECT COUNT(*) FROM blogs WHERE categoryId = $1'
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
  if (!id || !isValidUUID(id))
    return next(createCustomError(`Invalid params`, 400));

  const { rows } = await pool.query(
    `SELECT b.id, b.title, b.userId, b.body,
    b.blogImagePath, b.categoryId, b.context,
    b.createdAt, u.username, u.userImagePath,
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

const editBlog = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { title, body, categoryId } = req.body;

  if (!id || !isValidUUID(id)) {
    if (req.file) await fs.unlink(req.file.path);
    return next(createCustomError('Invalid data', 400));
  }

  const validatedData = EditBlogProps.safeParse({
    title,
    body,
    categoryId,
  });
  if (!validatedData.success)
    return next(createCustomError('Invalid data', 400));

  const oldBlog = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
  if (oldBlog.rows.length === 0)
    return next(createCustomError('blog could not be found', 404));

  if (oldBlog.rows[0].imagepath) {
    await fs.unlink(oldBlog.rows[0].imagepath);
  }

  const queryClause = req.file
    ? 'UPDATE blogs SET title = $1, body = $2, categoryId = $3, blogImagePath = $4 WHERE id = $5 RETURNING *'
    : 'UPDATE blogs SET title = $1, body = $2, categoryId = $3 WHERE id = $4 RETURNING *';
  const values = req.file
    ? [
        validatedData.data.title,
        validatedData.data.body,
        validatedData.data.categoryId,
        req.file.path,
        id,
      ]
    : [
        validatedData.data.title,
        validatedData.data.body,
        validatedData.data.categoryId,
        id,
      ];
  const { rows } = await pool.query(queryClause, values);
  if (rows.length === 0)
    return next(createCustomError('could not update the blog', 400));

  res.json({ success: true, newBlog: rows[0] });
});

const insertComment = asyncWrapper(async (req, res, next) => {
  const { comment, userId, blogId, username } = req.body;

  if (!isValidUUID(userId) || !isValidUUID(blogId))
    return next(createCustomError('Invalid data', 400));

  const validateData = CommentsProps.safeParse({ comment, username });
  if (!validateData.success)
    return next(createCustomError('Invalid data', 400));

  const { rows } = await pool.query(
    'INSERT INTO comments (id, userId, blogId, comment, username) VALUES($1, $2, $3, $4, $5) RETURNING id, userId, blogId, comment, username',
    [
      uuid(),
      userId,
      blogId,
      validateData.data.comment,
      validateData.data.username,
    ]
  );

  if (rows.length === 0)
    return next(createCustomError('failed insertion, try again', 500));

  return res.json({ success: true, data: rows[0] });
});

const getComments = asyncWrapper(async (req, res, next) => {
  const { blogId } = req.body;

  if (!isValidUUID(blogId))
    return next(createCustomError('Invalid data', 400));

  const { rows } = await pool.query(
    'SELECT cm.id, cm.username, cm.created_at, cm.comment, cm.userId, u.userImagePath FROM comments cm JOIN users u ON u.id = cm.userId WHERE cm.blogId = $1',
    [blogId]
  );

  if (rows.length === 0)
    return next(createCustomError('no comments found', 404));

  return res.json({ success: true, data: rows });
});

module.exports = {
  insertABlog,
  getBlogs,
  getSingleBlog,
  getSearchedBlogs,
  editBlog,
  insertComment,
  getComments,
};
