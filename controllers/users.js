const pool = require('../database/db');
const asyncWrapper = require('../middlewares/async');
const isValidUUIDV4 = require('../util/uuidV4Regex');
const { createCustomError } = require('../errors/custom-error');

const getSingleUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  if (!id || !isValidUUIDV4(id))
    return next(createCustomError('Invalid Params', 400));

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (rows.length === 0) return next(createCustomError('User not found', 400));
  delete rows[0].password;
  delete rows[0].refreshtoken;
  res.json({ success: true, user: rows[0] });
});

module.exports = { getSingleUser };
