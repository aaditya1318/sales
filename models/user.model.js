const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    employeeId: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    office: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OfficeLocation",
        required: true,
    },
    profile: {
        type: String,
        required: true
    },
    allowedFromOutSideOffice: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ["Administration", "Employee"],
        required: true
    }
}, {
    timestamps: true,
});


UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (error) {
        return next(error);
    }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
