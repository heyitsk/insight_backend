const { Pool } = require("pg");

const { buildSchemaInfo } = require("./schemaBuilder"); // include .js

// PostgreSQL config — use your real credentials
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "kushagra",
  password: "15481548",
  database: "aiagent",
});

(async () => {
  try {
    const schemaInfo = await buildSchemaInfo(pool);
    console.log("✅ Schema Info:\n", schemaInfo);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
})();
