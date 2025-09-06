const DailyReport = require("../models/reporting.model");
const moment = require("moment");
const User = require("../models/user.model");
const { generateToken, uploadProfile, uploadImageToS3 } = require("../utils/helper");
const { SendError, SendSuccess } = require("../utils/response");
const Attendance = require("../models/attendance.model");

exports.login = async (req, res, next) => {
    try {
        const { email, password, lat, lng } = req.body;
        const clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').replace(/^::ffff:/, '');

        if (lat == null || lng == null) {
            return SendError(res, 400, "Current location required for login");
        }

        const user = await User.findOne({ email });
        if (!user) return SendError(res, 400, "User not registered");

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return SendError(res, 400, "Invalid credentials");

        // const office = await officeLocationModel.findOne({
        //     location: {
        //         $nearSphere: {
        //             $geometry: {
        //                 type: "Point",
        //                 coordinates: [lng, lat],
        //             },
        //             $maxDistance: 50,
        //         },
        //     },
        // });

        // if (!user.allowedFromOutSideOffice) {
        //     if (!office) {
        //         return SendError(res, 403, "You must be inside office for  login (location check failed)");
        //     }
        //     if (office.wifiIp?.trim() !== clientIp.trim()) {
        //         return SendError(res, 403, "You must be inside office for login (IP check failed)");
        //     }
        // }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOneAndUpdate(
            { userId: user._id, date: today },
            {
                $push: {
                    sessions: {
                        loginTime: new Date(),
                        officeWifiIP: clientIp,
                        location: {
                            type: "Point",
                            coordinates: [lng, lat]
                        }
                    }
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        const payload = {
            token: generateToken({ _id: user._id, email: user.email, role: user.role }),
            attendance
        };

        return SendSuccess(res, payload, "Login successful");
    } catch (error) {
        next(error);
    }
};

exports.getDataById = async (req, res, next) => {
    try {
        const { _id } = req.user;
        const userData = await User.findById(_id);
        if (!userData) {
            return SendError(res, 400, "User Not Found");
        }
        userData.password = undefined;
        return SendSuccess(res, userData, "User Data Fetched Successfully");
    } catch (error) {
        return next(error);
    }
};

exports.logout = async (req, res, next) => {
    try {
        const { _id } = req.user;
        console.log('_id: ', _id);
        const { lat, lng, meterReading } = req.body;

        if (!lat || !lng || !meterReading) {
            return SendError(res, 400, "lat, lng, and meterReading are required for logout.");
        }

        if (!req.file) {
            return SendError(res, 400, "Meter photo is required for logout.");
        }

        const now = new Date();
        const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({ userId: _id, date: today });
        if (!attendance || !attendance.sessions.length) {
            return SendError(res, 404, "No login record found for today.");
        }

        const sessions = attendance.sessions;
        const lastSession = sessions[sessions.length - 1];

        if (lastSession.logoutTime) {
            return SendError(res, 400, "Already logged out today.");
        }

        lastSession.logoutTime = new Date();


        // ✅ 2. STOP DAILY REPORT
        const dailyReport = await DailyReport.findOne({
            user: _id,
            date: { $gte: startOfDayUTC, $lt: endOfDayUTC },
        });

        if (!dailyReport) {
            return SendError(res, 404, "No active daily report found for today.");
        }

        console.log('dailyReport.officeEnd: ', dailyReport.officeEnd);
        if (dailyReport.timestamp) {
            return SendError(res, 400, "Daily reporting already stopped.");
        }

        const meterPhotoUrl = await uploadImageToS3(req.file, _id, "daily-report");

        dailyReport.officeEnd = {
            meterPhoto: meterPhotoUrl,
            meterReading,
            timestamp: new Date(),
            location: {
                type: "Point",
                coordinates: [lng, lat],
            },
        };

        await dailyReport.save();
        await attendance.save();

        return SendSuccess(res, { attendance, dailyReport }, "Logout and reporting stopped successfully.");
    } catch (error) {
        next(error);
    }
};


