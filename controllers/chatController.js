// controllers/chatController.js
const { getPool } = require("../services/dbService");
const { buildSchemaInfo } = require("../services/dbService");
const {
  askGeminiSQL,
  askGeminiExplanation,
  generateFollowUpQuestions,
  generateExplorationSuggestions,
  validateAndImproveSQL,
} = require("../services/geminiService");
const { getChartRecommendation } = require("../services/chartAnalyzer");
const {
  getChatHistory,
  updateChatHistory,
  getConversationSummary,
} = require("../services/chatHistoryService");

async function ask(req, res, next) {
  const userQuestion = req.body.question;
  const sessionId = req.body.sessionId;
  if (!userQuestion) {
    return res.status(400).json({ error: "Missing question" });
  }
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session Id" });
  }
  const pool = getPool(sessionId);
  if (!pool) {
    return res
      .status(440)
      .json({ error: "Session expired. Please reconnect your database." });
  }
  try {
    const chatHistory = getChatHistory(sessionId);
    const conversationContext = getConversationSummary(chatHistory);

    const schemaInfo = await buildSchemaInfo(pool);

    const sqlPrompt = `
Database Schema:
${schemaInfo}

Conversation Context (recent messages):
${conversationContext ||
      "This is the beginning of our conversation."}

Current Question: "${userQuestion}"

Generate a SQL query that:
1. Answers the user's question accurately
2. Takes into account any previous conversation context
3. Uses proper JOINs when referencing multiple tables
4. Includes appropriate filters and aggregations
5. Handles potential data quality issues (NULLs, case sensitivity)
6. Limits results to reasonable size (LIMIT 100 unless specifically asked for more)

If the question refers to previous results or uses pronouns like "that", "those", "them", consider the conversation context to understand what they're referring to.`;
    let sqlQuery;
    let attemptCount = 0;
    const maxAttempts = 3;
    while (attemptCount < maxAttempts) {
      try {
        sqlQuery = await askGeminiSQL(sqlPrompt);
        console.log(`SQL attempt ${attemptCount + 1}:`, sqlQuery);

        // Test the SQL query
        const dbResult = await pool.query(sqlQuery);

        if (dbResult.rows) {
          // Success - break out of retry loop
          break;
        }
      } catch (sqlError) {
        console.log(
          `SQL attempt ${attemptCount + 1} failed:`,
          sqlError.message
        );
        attemptCount++;

        if (attemptCount < maxAttempts) {
          // Try to fix the SQL using Gemini
          try {
            sqlQuery = await validateAndImproveSQL(
              sqlQuery,
              schemaInfo,
              sqlError.message
            );
            console.log("Corrected SQL:", sqlQuery);
          } catch (fixError) {
            console.log("SQL correction failed:", fixError.message);
          }
        } else {
          // Final attempt failed
          return res.status(400).json({
            error: `SQL execution failed after ${maxAttempts} attempts: ${sqlError.message}`,
            sql: sqlQuery,
          });
        }
      }
    }

    const dbResult = await pool.query(sqlQuery);
    const dbRows = dbResult.rows;

    if (!dbRows || dbRows.length === 0) {
      return res.json({
        sql: sqlQuery,
        data: [],
        answer:
          "Your query executed successfully, but returned no results. This might mean there's no data matching your criteria, or you might want to adjust your question.",
        chart: null,
        suggestedQuestions: [
          "Can you show me all available data?",
          "What data do we have in this database?",
          "Show me a sample of the data",
        ],
      });
    }

    // STEP 3: Get intelligent chart recommendation
    const chartRecommendation = getChartRecommendation(dbRows, sqlQuery);
    console.log('Chart recommendation:', chartRecommendation);

    // STEP 4: Ask Gemini to explain results (no chart recommendation needed)
    const explainPrompt = `
    You are a professional data analyst having a conversation with a business user.
    
    Conversation History:
    ${conversationContext}
    
    Current Question: "${userQuestion}"
    
    Data Analysis Results:
    ${JSON.stringify(dbRows.slice(0, 5), null, 2)}
    ${dbRows.length > 5
        ? `... and ${dbRows.length - 5} more rows (total: ${
            dbRows.length
          } rows)`
        : ""
      }
    
    Please provide:
    1. A conversational business explanation of these results
    2. Key business insights and what they mean
    3. Reference previous conversation if relevant
    
    Format your response as JSON:
    \`\`\`json
    {
      "response": "Your conversational business explanation here. Be specific about the numbers and insights.",
      "insights": [
        "Key insight 1",
        "Key insight 2",
        "Key insight 3"
      ]
    }
    \`\`\`
    `;

    const explanation = await askGeminiExplanation(explainPrompt);
    let explanationText = explanation
      .replace(/^1\.\s*\*\*(.*?)\*\*\s*/gm, "") // Removes markdown-style heading
      .replace(/\*\*/g, "") // Removes all bold markers
      .replace(/^\d+\.\s*/gm, "") // Removes numbered points if needed
      .trim();
    console.log("raw response", explanationText);

    const match = explanationText.match(/\`\`\`json([\s\S]*?)\`\`\`/i);
    let chartInfo = null;
    if (match) {
      try {
        chartInfo = JSON.parse(match[1].trim());
        explanationText = explanationText.replace(match[0], "").trim(); // Removes the JSON part
        console.log("Final explanation text:", explanationText);
      } catch (e) {
        console.warn("Invalid chart JSON from Gemini.");
        console.log(e);
      }
    }
    let suggestedQuestions = [];
    try {
      const dataContext = {
        rowCount: dbRows.length,
        columns: Object.keys(dbRows[0] || {}),
        sampleData: dbRows.slice(0, 3),
      };

      suggestedQuestions = await generateFollowUpQuestions(
        dataContext,
        conversationContext
      );
    } catch (followUpError) {
      console.warn("Failed to generate follow-up questions:", followUpError);
      suggestedQuestions = [
        "Can you show me trends over time?",
        "How does this compare to other periods?",
        "What are the key drivers behind these results?",
      ];
    }
    // Final response with intelligent chart
    const responseData = {
      sql: sqlQuery,
      data: dbRows,
      answer: chartInfo?.response || explanationText,
      chart: {
        ...chartRecommendation.chartConfig,
        response: chartInfo?.response || explanationText,
      },
      insights: chartInfo?.insights || [],
      suggestedQuestions: suggestedQuestions,
    };
    updateChatHistory(sessionId, userQuestion, responseData);

    res.json(responseData);
  } catch (err) {
    next(err);
  }
}

module.exports = { ask };
