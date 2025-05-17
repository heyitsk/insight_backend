const { Pool } = require("pg");

async function testDatabaseConnection(config) {
  const pool = new Pool(config);

  try {
    // Test query
    const res = await pool.query("SELECT NOW()");
    await pool.end(); // close connection
    return { success: true, message: "Connection successful!" };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = { testDatabaseConnection };
