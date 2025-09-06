const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: true
    },
    shopAddress: {
        type: String,
        required: true
    },
    shopType: {
        type: String
    },
    ownerName: {
        type: String,
        required: true,
    },
    ownerContact: {
        type: String,
        required: true
    },
    shopContact: {
        type: String
    },
    shopPhoto: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number]
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

ShopSchema.index({ location: "2dsphere" });

ShopSchema.virtual('service', {
    ref: 'ShopService',
    localField: '_id',
    foreignField: 'shop',
    justOne: true
});


module.exports = mongoose.model("Shop", ShopSchema);