const express = require("express");
const Router = express.Router();
const controller = require("../controller/report.controller");
const { authMiddleware } = require("../middleware/auth");
const { upload } = require("../utils/helper");

Router.post("/start", authMiddleware, upload.single("meterPhoto"), controller.startDailyReport);

Router.post("/shop-visit", authMiddleware, upload.fields([
    { name: 'meterPhoto' },
    { name: 'shopPhoto' }
]), controller.addShopVisit);

Router.get("/today-visit", authMiddleware, controller.getTodayVisit);

Router.post("/add-service", authMiddleware, controller.addShopService);

module.exports = Router;
