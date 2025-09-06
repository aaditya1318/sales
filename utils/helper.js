const jwt = require("jsonwebtoken");
const path = require("path");
const User = require("../models/user.model");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const generateToken = (user) => {
    return jwt.sign({
            _id: user._id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "12h" }
    );
};

const generateEmployeeId = async () => {
    const totalUsers = await User.countDocuments();
    const year = new Date().getFullYear();
    const idNumber = (totalUsers + 1).toString().padStart(2, '0');
    return `EMP${idNumber}`;
};

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});

const uploadImageToS3 = async (file, userId, subFolder = "general") => {
    if (!file) throw new Error("File is required");

    const baseFolder = "marketing";
    const targetFolder = `${baseFolder}/${userId}/${subFolder}`;

    const ext = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${ext}`;
    const key = `${targetFolder}/${fileName}`;

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read",
        })
    );

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return fileUrl;
};

const uploadProfile = async (file) => {
    if (!file) throw new Error("File is required");

    const baseFolder = "marketing";
    const targetFolder = `${baseFolder}/profiles`;

    const ext = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${ext}`;
    const key = `${targetFolder}/${fileName}`;

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read",
        })
    );

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return fileUrl;
};


module.exports = {
    upload,
    generateToken,
    uploadImageToS3,
    uploadProfile,
    generateEmployeeId
};