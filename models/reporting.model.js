const mongoose = require("mongoose");
const { Schema } = mongoose;

const DailyReportSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    officeStart: {
        office: {
            type: Schema.Types.ObjectId,
            ref: "OfficeLocation",
            required: true
        },
        meterPhoto: {
            type: String,
            required: true
        },
        meterReading: {
            type: Number
        },
        timestamp: {
            type: Date,
            default: Date.now
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
    },
    shopsVisited: [
        {
            shop: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Shop",
                required: true
            },
            meterReading: {
                type: Number,
                required: true
            },
            meterPhoto: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    officeEnd: {
        meterPhoto: {
            type: String
        },
        meterReading: {
            type: Number
        },
        timestamp: {
            type: Date,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
            }
        }
    }

}, { timestamps: true });


DailyReportSchema.index({ "shops.location": "2dsphere" });
DailyReportSchema.index({ user: 1, date: 1 });   

module.exports = mongoose.model("DailyReport", DailyReportSchema);
