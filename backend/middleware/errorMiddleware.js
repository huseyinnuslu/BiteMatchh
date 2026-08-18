export const notFound = (req, res, next) => {
  const error = new Error(`Bulunamadı - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    ...(err.activeRoom ? { activeRoom: err.activeRoom } : {}),
    ...(err.code ? { code: err.code } : {}),
    ...(err.email ? { email: err.email } : {}),
  });
};
