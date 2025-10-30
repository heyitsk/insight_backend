// utils/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  let errorMessage = "I encountered an error processing your request.";
  if (err.message.includes("SQL")) {
    errorMessage =
      "There was an issue with the SQL query. Please try rephrasing your question.";
  } else if (err.message.includes("timeout")) {
    errorMessage =
      "The query took too long to execute. Try asking for a smaller subset of data.";
  }

  res.status(500).json({
    error: errorMessage,
    details: err.message,
  });
}

module.exports = errorHandler;
