const pool = require('../database/db');
const asyncWrapper = require('../middlewares/async');
const isValidUUID = require('../util/uuidV4Regex');
const { createCustomError } = require('../errors/custom-error');
const { UserBlogsQueries } = require('../util/zod');

const getSingleUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  if (!id || !isValidUUID(id))
    return next(createCustomError('Invalid Params', 400));

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (rows.length === 0) return next(createCustomError('User not found', 400));
  delete rows[0].password;
  delete rows[0].refreshToken;
  res.json({ success: true, user: rows[0] });
});



const getAllBlogsOfUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { page, limit } = req.query;

  if (!id || !isValidUUID(id))
    return next(createCustomError('Invalid Params', 400));

  const validatedQueries = UserBlogsQueries.safeParse({ page, limit });
  if (!validatedQueries.success)
    return next(createCustomError('Invalid data', 400));

  const currentPage = parseInt(page) || 1;
  const blogLimit = parseInt(limit) || 6;
  const offset = (currentPage - 1) * blogLimit;

  const { rows } = await pool.query(
    'SELECT * FROM blogs WHERE blogs.userId = $1 LIMIT $2 OFFSET $3',
    [id, blogLimit, offset]
  );

  if (rows.length === 0)
    return next(createCustomError('Could not find more blogs', 404));

  const countRequest = await pool.query(
    'SELECT COUNT(*) from blogs WHERE blogs.userId = $1',
    [id]
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

module.exports = { getSingleUser, getAllBlogsOfUser };
