const express = require("express");
const Router = express.Router();
const controller = require("../controller/user.controller");
const { upload } = require("../utils/helper");
const { authMiddleware } = require("../middleware/auth");

Router.post("/login", controller.login);

Router.get("/getdataById", authMiddleware, controller.getDataById);

Router.post("/logout", authMiddleware, upload.single("meterPhoto"), controller.logout);

module.exports = Router;
