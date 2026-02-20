const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const createSuperAdmin = async () => {
    try {
        await connectDB();

        const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
        if (existingSuperAdmin) {
            console.log('SuperAdmin already exists.');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('super123', salt);

        const superAdmin = await User.create({
            username: 'superadmin',
            password: hashedPassword,
            role: 'superadmin'
        });

        console.log('SuperAdmin created successfully:');
        console.log('Username: superadmin');
        console.log('Password: super123');

        process.exit();
    } catch (error) {
        console.error('Error creating SuperAdmin:', error);
        process.exit(1);
    }
};

createSuperAdmin();
