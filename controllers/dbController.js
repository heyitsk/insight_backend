// controllers/dbController.js
const { createPool } = require("../services/dbService");

async function connectDb(req, res) {
  const { host, port, user, password, database, sessionId } = req.body;

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
}

module.exports = { connectDb };
