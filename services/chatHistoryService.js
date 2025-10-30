// services/chatHistoryService.js
const chatHistories = new Map();
const MAX_HISTORY_LENGTH = 20;

function updateChatHistory(sessionId, userQuestion, aiResponse) {
  if (!chatHistories.has(sessionId)) {
    chatHistories.set(sessionId, []);
  }

  const history = chatHistories.get(sessionId);

  // Add user message
  history.push({
    role: "user",
    content: userQuestion,
    timestamp: new Date(),
  });

  // Add AI response
  history.push({
    role: "assistant",
    content: aiResponse.answer,
    sql: aiResponse.sql,
    data: aiResponse.data,
    timestamp: new Date(),
  });

  // Keep only recent messages to prevent context overflow
  if (history.length > MAX_HISTORY_LENGTH) {
    history.splice(0, history.length - MAX_HISTORY_LENGTH);
  }

  chatHistories.set(sessionId, history);
}

function getConversationSummary(history) {
  const recentContext = history
    .filter((msg) => msg.role === "user")
    .slice(-5) // Last 5 user questions
    .map((msg) => msg.content)
    .join("; ");

  return recentContext;
}

function getChatHistory(sessionId) {
  return chatHistories.get(sessionId) || [];
}

module.exports = {
  updateChatHistory,
  getConversationSummary,
  getChatHistory,
};
