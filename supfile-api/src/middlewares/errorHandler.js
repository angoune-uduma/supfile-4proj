export function errorHandler(err, _req, res, _next) {
  console.error("[error]", err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: {
      message,
      status
    }
  });
}