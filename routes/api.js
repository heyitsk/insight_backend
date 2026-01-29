// routes/api.js
const express = require("express");
const router = express.Router();
const chatRoutes = require("./chat");
const dbRoutes = require("./db");
const testRoutes = require("./test");

router.use("/chat", chatRoutes);
router.use("/db", dbRoutes);
router.use("/test", testRoutes);

module.exports = router;
