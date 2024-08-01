const notFound = (req, res) =>
  res.status(404).send('the route needed is not available');

module.exports = notFound;
