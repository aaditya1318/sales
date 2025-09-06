const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { SendError } = require("../utils/response");

exports.authMiddleware = async (req, res, next) => {
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            const token = req.header("Authorization")?.replace("Bearer ", "");
            if (!token) {
                console.log("gdfgfgf");
                return SendError(res, 401, "Unauthorized: No token provided");
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!decoded) {
                return SendError(res, 401, "Unauthorized: No token provided")
            }

            const user = await User.findById(decoded._id);
            if (!user) return SendError(res, 401, "Unauthorized: User not found");
            req.user = { _id: user._id, email: user.email, name: user.name };
            next();
        } else {
            return SendError(res, 401, "Authorization header missing or incorrect");
        }
    } catch (err) {
        console.log('err: ', err);
        next(err);
    }
};

exports.isAdmin = async (req, res, next) => {
      try {
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            const token = req.header("Authorization")?.replace("Bearer ", "");
            if (!token) {
                return SendError(res, 401, "Unauthorized: No token provided");
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!decoded || decoded.role != "Administration") {
                return SendError(res, 401, "Unauthorized to access this route")
            }

            const user = await User.findById(decoded._id);
            if (!user) return SendError(res, 401, "Unauthorized: User not found");
            req.user = { _id: user._id, email: user.email, name: user.name };
            next();
        } else {
            return SendError(res, 401, "Authorization header missing or incorrect");
        }
    } catch (err) {
        next(err);
    }
};