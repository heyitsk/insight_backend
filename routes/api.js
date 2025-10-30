// routes/api.js
const express = require("express");
const router = express.Router();
const chatRoutes = require("./chat");
const dbRoutes = require("./db");

router.use("/chat", chatRoutes);
router.use("/db", dbRoutes);

module.exports = router;
