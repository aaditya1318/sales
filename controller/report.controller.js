const DailyReport = require("../models/reporting.model");
const OfficeLocation = require("../models/officeLocation.model");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const { uploadImageToS3 } = require("../utils/helper");
const { SendError, SendSuccess } = require("../utils/response");
const ShopService = require("../models/shopService.model");

exports.startDailyReport = async (req, res, next) => {
    try {
        const { lat, lng, meterReading } = req.body;
        const { _id } = req.user;
        const clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').replace(/^::ffff:/, '');
        console.log('clientIp: ', clientIp);

        if (!lat || !lng || !meterReading) {
            return SendError(res, 400, "All Fields are Required");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const [office, user] = await Promise.all([
            OfficeLocation.findOne(
                //     {
                //     location: {
                //         $nearSphere: {
                //             $geometry: {
                //                 type: "Point",
                //                 coordinates: [lng, lat],
                //             },
                //             $maxDistance: 50,
                //         },
                //     },
                // }
            ),
            User.findById(_id),
        ]);


        if (!user.allowedFromOutSideOffice) {
            if (office.wifiIp?.trim() !== clientIp.trim()) {
                return SendError(res, 403, "You must be inside office for login (IP check failed)");
            }
        }

        const existingReport = await DailyReport.findOne({
            user: req.user._id,
            date: { $gte: today, $lt: tomorrow },
        });

        if (existingReport) {
            return SendError(res, 403, "You already have a daily report for today.");
        }

        const meterPhoto = req.file
            ? await uploadImageToS3(req.file, req.user._id, "daily-report")
            : null;

        const report = await DailyReport.create({
            user: req.user._id,
            date: new Date(),
            officeStart: {
                office: office._id,
                meterPhoto,
                meterReading,
                location: {
                    type: "Point",
                    coordinates: [lng, lat]
                }
            },
            shopsVisited: [],
        });

        return SendSuccess(res, report, "Reporting Started Successfully");

    } catch (err) {
        next(err);
    }
};

exports.addShopVisit = async (req, res, next) => {
    try {
        const {
            shopName,
            meterReading,
            lat,
            lng,
            shopAddress,
            shopType,
            ownerName,
            ownerContact,
            shopContact
        } = req.body;

        // ✅ Required fields check
        if (!shopName || !meterReading || !lat || !lng || !shopAddress || !shopType || !ownerName || !ownerContact) {
            return SendError(res, 400, "All fields (shopName, meterReading, lat, lng, etc.) are required.");
        }

        // ✅ Get today's report
        const now = new Date();
        const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

        const dailyReport = await DailyReport.findOne({
            user: req.user._id,
            date: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
            },
        });

        if (!dailyReport) {
            return SendError(res, 404, "No active daily report found for today. Please start a report first.");
        }

        // ✅ Upload meter photo (required)
        if (!req.files?.meterPhoto?.[0]) {
            return SendError(res, 400, "Meter photo is required for the shop visit.");
        }

        const meterPhotoUrl = await uploadImageToS3(req.files.meterPhoto[0], req.user._id, "meter-photos");

        let shop = await Shop.findOne({ shopName });

        // ✅ If shop does not exist, create it (with required shop photo)
        if (!shop) {
            if (!req.files?.shopPhoto?.[0]) {
                return SendError(res, 400, "Shop photo is required for new shop.");
            }

            const shopPhotoUrl = await uploadImageToS3(req.files.shopPhoto[0], req.user._id, "shop-photos");

            const shopLocation = {
                type: "Point",
                coordinates: [lng, lat],
            };

            shop = new Shop({
                shopName,
                shopAddress,
                shopType,
                ownerName,
                ownerContact,
                shopContact,
                location: shopLocation,
                shopPhoto: shopPhotoUrl,
            });

            await shop.save();
        }

        // ✅ Prevent duplicate shop visit
        const alreadyVisited = dailyReport.shopsVisited.find(
            (visit) => visit.shop.toString() === shop._id.toString()
        );

        if (alreadyVisited) {
            return SendError(res, 400, "Shop visit already recorded for this shop today.");
        }

        // ✅ Push new visit to the report
        dailyReport.shopsVisited.push({
            shop: shop._id,
            meterReading,
            meterPhoto: meterPhotoUrl,
            timestamp: new Date(),
        });

        await dailyReport.save();

        return SendSuccess(res, dailyReport, "Shop visit added successfully.");
    } catch (err) {
        next(err);
    }
};

exports.getTodayVisit = async (req, res, next) => {
    try {
        console.log("ip", req.ip);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyReport = await DailyReport.find({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
        })
            .populate({
                path: 'shopsVisited.shop',
                select: 'shopName shopPhoto',
                populate: {
                    path: 'service',
                    model: 'ShopService'
                }
            })
            .lean();

        if (!dailyReport.length) {
            return SendError(res, 400, "No Visit Found For Today");
        }

        const shopCount = dailyReport[0]?.shopsVisited?.length || 0;

        return SendSuccess(res, { dailyReport, shopCount }, "Today's visit report fetched successfully.");
    } catch (err) {
        next(err);
    }
};

exports.addShopService = async (req, res, next) => {
    try {
        const {
            shopId,
            providerName,
            services,
            notProvided,
            expectedService,
            feedback,
            volume
        } = req.body;

        if (!shopId || !providerName || !services || !Array.isArray(services) || services.length === 0) {
            return SendError(res, 400, "Required fields missing or invalid: shopId, providerName, services");
        }

        const hasInvalidService = services.some(s =>
            !s.serviceName || typeof s.serviceName !== 'string' ||
            !s.charge || isNaN(parseFloat(s.charge))
        );
        if (hasInvalidService) {
            return SendError(res, 400, "Each service must have a valid serviceName and charge");
        }

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return SendError(res, 404, "Shop not found");
        }

        const newService = new ShopService({
            shop: shopId,
            providerName,
            services,
            notProvided,
            expectedService,
            feedback,
            volume
        });

        await newService.save();

        return SendSuccess(res, newService, "Service added successfully.");
    } catch (error) {
        console.error("addShopService error:", error);
        return SendError(res, 500, error.message);
    }
};

exports.stopReporting = async (req, res, next) => {
    try {
        const { lat, lng, meterReading } = req.body;
        const { _id } = req.user;

        if (!lat || !lng || !meterReading) {
            return SendError(res, 400, "All fields (lat, lng, meterReading) are required.");
        }

        const now = new Date();
        const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

        const existingReport = await DailyReport.findOne({
            user: _id,
            date: { $gte: startOfDayUTC, $lt: endOfDayUTC },
        });

        if (!existingReport) {
            return SendError(res, 404, "No active daily report found for today.");
        }

        if (!req.file) {
            return SendError(res, 400, "Meter photo is required to stop reporting.");
        }

        const meterPhoto = await uploadImageToS3(req.file, _id, "daily-report");

        existingReport.officeEnd = {
            meterPhoto,
            meterReading,
            timestamp: new Date(),
            location: {
                type: "Point",
                coordinates: [lng, lat],
            },
        };

        await existingReport.save();

        return SendSuccess(res, existingReport, "Reporting stopped successfully.");
    } catch (error) {
        next(error);
    }
};
