// routes/db.js
const express = require("express");
const router = express.Router();
const { connectDb } = require("../controllers/dbController");

router.post("/connect", connectDb);

module.exports = router;
