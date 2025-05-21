const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { buildSchemaInfo } = require("./utils/schemaBuilder");
const { createPool, getPool, hasPool } = require("./services/dbManager");
const { askGeminiSQL, askGeminiExplanation } = require("./controllers/gemini");
const { extractChartType } = require("./utils/extractChartType");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(bodyParser.json());

app.post("/ask", async (req, res) => {
  const userQuestion = req.body.question;
  const sessionId = req.body.sessionId;
  const userSpecifiedType = extractChartType(userQuestion);
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
    // STEP 1: Ask Gemini to convert question to SQ
    const schemaInfo = await buildSchemaInfo(pool);
    // console.log("sechaminfo", schemaInfo);

    const sqlPrompt = `Given this database schema:\n${schemaInfo}\nConvert the following natural language question into a SQL query:\n"${userQuestion}"\nOnly return the SQL code.`;
    const sqlQuery = await askGeminiSQL(sqlPrompt);
    // console.log("Generated SQL:", sqlQuery);

    // console.log("Pool exists:", !!pool);

    // STEP 2: Run the SQL
    const dbResult = await pool.query(sqlQuery);
    const dbRows = dbResult.rows;

    if (dbResult.error) {
      return res.status(400).json({ error: dbResult.error, sql: sqlQuery });
    }

    // STEP 3: Ask Gemini to explain results
    const explainPrompt = `
Here is the data: 
${JSON.stringify(dbRows, null, 2)}

User's original question: "${userQuestion}"

Please do the following:
1. Write a simple business explanation of what this data shows (in plain English).
2. Suggest the best chart type to visualize it. ${
      userSpecifiedType
        ? `The user explicitly mentioned they want a "${userSpecifiedType}" chart, so use that.`
        : "Choose the most suitable chart based on the data."
    }

Return the result as a JSON object inside a \`\`\`json block like:
\`\`\`json
{
  "type": "chart_type_here",
  "x": "column_for_x_axis",
  "y": "column_for_y_axis"
}
\`\`\`

ONLY include the JSON at the end inside the code block.
`;

    const explanation = await askGeminiExplanation(explainPrompt);
    let explanationText = explanation
      .replace(/^1\.\s*\*\*(.*?)\*\*\s*/gm, "") // Removes markdown-style heading
      .replace(/\*\*/g, "") // Removes all bold markers
      .replace(/^\d+\.\s*/gm, "") // Removes numbered points if needed
      .trim();
    console.log("raw response", explanationText);

    const match = explanationText.match(/```json([\s\S]*?)```/i);
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
    // Final response
    res.json({
      sql: sqlQuery,
      data: dbRows,
      answer: explanationText,
      chart: chartInfo,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({ error: err.message });
  }
});
app.post("/connect-db", async (req, res) => {
  const { host, port, user, password, database, sessionId } = req.body;
  console.log(req.body);

  if (!host || !port || !user || !password || !database || !sessionId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing credentials" });
  }

  try {
    const pool = createPool(sessionId, {
      host,
      port,
      user,
      password,
      database,
    });
    await pool.query("SELECT 1"); // test connection

    res.json({ success: true, message: "Connected successfully!" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
    console.log(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
