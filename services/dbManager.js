// dbManager.js
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

module.exports = { createPool, getPool, hasPool };
