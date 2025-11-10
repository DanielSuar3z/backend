function successResponse(res, data, message = 'Operación exitosa', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function errorResponse(res, message = 'Error en la operación', statusCode = 500, error = null) {
  const response = {
    success: false,
    message
  };

  if (error && process.env.NODE_ENV !== 'production') {
    response.error = error.toString();
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse
};