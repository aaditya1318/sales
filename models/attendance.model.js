const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
    loginTime: {
        type: Date,
        required: true
    },
    logoutTime: {
        type: Date,
        default: null
    },
    officeWifiIP: {
        type: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    }
}, { _id: false });

const AttendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    sessions: [SessionSchema]
}, {
    timestamps: true
});

// Index to ensure only one attendance record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
