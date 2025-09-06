const mongoose = require("mongoose");

exports.connect = () => {
    mongoose.connect(process.env.DB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
    }).then(async () => {
        console.log("DB Connected Successfully")
    })
        .catch((error) => {
            console.log("DB Connection Failed");
            console.error("---------------------------------", error.message);
            process.exit(1);
        })
};