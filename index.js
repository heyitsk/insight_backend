const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { askGemini } = require("./gemini");
const { runSQLQuery } = require("./queryEngine");
const { buildSchemaInfo } = require("./schemaBuilder");
const { testDatabaseConnection } = require("./connectDb");
const { createPool, getPool, hasPool } = require("./dbManager");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));

app.use(bodyParser.json());

// TEXTUAL schema passed to Gemini
// const schemaInfo = `
// Tables:
// - customers(id, name, email)
// - orders(id, customer_id, product, amount, date)

app.post("/ask", async (req, res) => {
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
    // STEP 1: Ask Gemini to convert question to SQ
    const schemaInfo = await buildSchemaInfo(pool);
    console.log("sechaminfo", schemaInfo);

    const sqlPrompt = `Given this database schema:\n${schemaInfo}\nConvert the following natural language question into a SQL query:\n"${userQuestion}"\nOnly return the SQL code.`;
    const sqlQuery = await askGemini(sqlPrompt);
    console.log("Generated SQL:", sqlQuery);

    console.log("Pool exists:", !!pool);

    // STEP 2: Run the SQL
    const dbResult = await pool.query(sqlQuery);
    const dbRows = dbResult.rows;

    if (dbResult.error) {
      return res.status(400).json({ error: dbResult.error, sql: sqlQuery });
    }

    // STEP 3: Ask Gemini to explain results
    const explainPrompt = `Here is the data: ${JSON.stringify(
      dbRows
    )}\nProvide a business explanation in simple language in about 50 words and suggest a chart type in maximum 4 words.`;
    const explanation = await askGemini(explainPrompt);

    // Final response
    res.json({
      sql: sqlQuery,
      data: dbRows,
      answer: explanation,
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
