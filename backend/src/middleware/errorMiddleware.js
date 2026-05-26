export function errorMiddleware(err, _req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = Number(err?.statusCode ?? 500);
  res.status(status).json({
    message: err?.message ?? "Server error",
  });
}

