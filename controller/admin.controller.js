const shopModel = require("../models/shop.model");
const Report = require("../models/reporting.model");
const { SendSuccess, SendError } = require("../utils/response");
const User = require("../models/user.model");
const { generateToken, uploadProfile, generateEmployeeId } = require("../utils/helper");
const officeLocationModel = require("../models/officeLocation.model");

exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !name || !password) {
            return SendError(res, 400, "All Fields are Rrequired");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return SendError(res, 400, "User already exists");
        }

        const office = await officeLocationModel.findOne();
        if (!office) return SendError(res, 500, "Office location not configured");

        const profile = await uploadProfile(req.file);
        const employeeId = await generateEmployeeId();

        const user = await User.create({
            name,
            email,
            password,
            profile,
            employeeId,
            office: office._id,
            role: "Employee",
            allowedFromOutSideOffice: false
        });

        user.password = undefined;

        return SendSuccess(res, user, "User Registered Successfully");

    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password, } = req.body;

        if (!email || !password) {
            return SendError(res, 400, "All Fields are required");
        }

        const user = await User.findOne({ email });
        if (!user || user.role != "Administration") {
            return SendError(res, 400, "User not registered");
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return SendError(res, 400, "Invalid credentials");

        const token = generateToken({ _id: user._id, email: user.email, role: user.role });

        return SendSuccess(res, token, "Login successful");
    } catch (error) {
        next(error);
    }
};

exports.getAllShops = async (req, res, next) => {
    try {
        const shops = await shopModel.find().populate("service");
        return SendSuccess(res, shops, "Shops Fetched Successfully");
    } catch (error) {
        next(error);
    }
};

exports.getShopById = async (req, res, next) => {
    try {
        const shop = await shopModel.findById(req.params.id).populate("service");
        if (!shop) return SendError(res, 400, "Shop Not Found");
        return SendSuccess(res, shop, "Shop Details Fetched Successfully");
    } catch (error) {
        next(error);
    }
};

exports.getReports = async (req, res, next) => {
    try {
        const { user, date } = req.query;
        const filter = {};

        if (user) filter.user = user;
        if (date) {
            const targetDate = new Date(date);
            filter.date = {
                $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                $lte: new Date(targetDate.setHours(23, 59, 59, 999))
            };
        }

        const reports = await Report.find(filter)
            .populate("user")
            .populate("shopsVisited.shop")
            .populate("officeStart.office");

        return SendSuccess(res, reports, "Reports Fetched Successfully");
    } catch (error) {
        console.log('error: ', error);
        next(error);
    }
};

exports.setOutsideOfficeAccess = async (req, res, next) => {
    try {
        const { userId, allowed } = req.body;

        if (!userId || typeof allowed !== 'boolean') {
            return SendError(res, 400, "Both 'userId' and 'allowed' (boolean) are required");
        }

        const user = await User.findById(userId);
        if (!user) {
            return SendError(res, 400, "User not found");
        }

        user.allowedFromOutSideOffice = allowed;
        await user.save();
        return SendSuccess(res, [],  `Outside office access ${allowed ? 'enabled' : 'disabled'} for ${user.name}`)

    } catch (error) {
        console.error("Error setting outside access:", error);
        next(error);
    }
};
