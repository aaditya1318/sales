const express = require("express");
const Router = express.Router();
const controller = require("../controller/admin.controller");
const { upload } = require("../utils/helper");
const { authMiddleware, isAdmin } = require("../middleware/auth");

Router.get("/getAllShops", isAdmin, controller.getAllShops);

Router.get("/getShopDrtails/:id", authMiddleware, controller.getShopById);

Router.get("/reports", controller.getReports);

Router.post("/register", isAdmin, upload.single("profile"), controller.register);

Router.post("/login", controller.login);

Router.post("/setOutsideLocation", isAdmin, controller.setOutsideOfficeAccess);

module.exports = Router;