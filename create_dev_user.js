const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createDevUser = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const email = 'dev@gmail.com';
        const password = '00000';
        const name = 'Dev User';
        const mobile = '0000000000';

        let user = await User.findOne({ email });

        if (user) {
            console.log('User already exists');
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();
            console.log('User password updated to 00000');
        } else {
            user = new User({
                name,
                email,
                mobile,
                password
            });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();
            console.log('User dev@gmail.com created with password 00000');
        }

        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

createDevUser();
