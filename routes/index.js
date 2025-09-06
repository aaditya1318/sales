const express = require("express");
const Router = express.Router();
const authRoutes = require("./auth.routes");
const reportRoutes = require("./reporting.routes");
const adminRoutes = require("./admin.routes");

Router.use('/auth', authRoutes);

Router.use("/report", reportRoutes);

Router.use("/admin", adminRoutes);

module.exports = Router;