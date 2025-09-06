const mongoose = require("mongoose");

const ShopServiceSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    providerName: {
        type: String,
        required: true
    },
    services: [{
        serviceName: { type: String, required: true },
        charge: { type: mongoose.Schema.Types.Decimal128, required: true }
    }],
    notProvided: [{
        type: String
    }],
    expectedService: [{
        type: String
    }],
    feedback: {
        type: String
    },
    volume: {
        type: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("ShopService", ShopServiceSchema);