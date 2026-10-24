function formatValidationError(err) {
  const details = [];
  if (err && err.errors) {
    for (const [field, errorObj] of Object.entries(err.errors)) {
      details.push({
        field: errorObj.path || field,
        message: errorObj.message,
      });
    }
  }
  return {
    error: "Validation failed",
    details,
  };
}

module.exports = { formatValidationError };
