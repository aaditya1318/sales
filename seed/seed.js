const OfficeLocation = require("../models/officeLocation.model");
const userModel = require("../models/user.model");
const { generateEmployeeId } = require("../utils/helper");

const seedOffice = async () => {
    try {
        const count = await OfficeLocation.countDocuments();
        const adminCount = await userModel.countDocuments({ role: 'Administration' });
        if (count === 0) {
            await OfficeLocation.create({
                locationName: "Main Office",
                location: {
                    type: "Point",
                    coordinates: [75.87129778645809, 22.68709412203773]
                },
                radiusMeter: 50,
                wifiIp: " 192.168.1.1"
            });
            console.log("✅ Office location seeded");
        }
        if (adminCount == 0) {
            const employeeId = await generateEmployeeId();
            const office = await OfficeLocation.findOne();
            await userModel.create({
                email: "admin@sparkuptech.in",
                employeeId: employeeId,
                name: "admin",
                office: office._id,
                password: "123465",
                profile: "https://avatar.iran.liara.run/public/",
                role: "Administration",
            });
            console.log("✅ Admin user seeded");
        }
    } catch (error) {
        console.log('error: ', error);
    }

};

module.exports = seedOffice;
