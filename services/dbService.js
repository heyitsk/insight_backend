// services/dbService.js
const { Pool } = require("pg");

// In-memory store: sessionId → Pool
const poolMap = new Map();

function createPool(sessionId, config) {
  if (poolMap.has(sessionId)) {
    return poolMap.get(sessionId); // already created
  }

  const pool = new Pool(config);
  poolMap.set(sessionId, pool);
  return pool;
}

function getPool(sessionId) {
  return poolMap.get(sessionId);
}

function hasPool(sessionId) {
  return poolMap.has(sessionId);
}

async function buildSchemaInfo(pool) {
  const query = `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  const res = await pool.query(query);

  // Group columns by table
  const schemaMap = {};

  for (const row of res.rows) {
    const { table_name, column_name } = row;

    if (!schemaMap[table_name]) {
      schemaMap[table_name] = [];
    }

    schemaMap[table_name].push(column_name);
  }

  // Format the schema string
  const schemaInfoLines = ["Tables:"];
  for (const [table, columns] of Object.entries(schemaMap)) {
    schemaInfoLines.push(`- ${table}(${columns.join(", ")})`);
  }

  return schemaInfoLines.join("\n");
}

module.exports = { createPool, getPool, hasPool, buildSchemaInfo };
