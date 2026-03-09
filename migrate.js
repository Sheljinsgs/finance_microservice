const mongoose = require('mongoose');
const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Debt = require('./models/Debt');
const Expense = require('./models/Expense');
const Goal = require('./models/Goal');
const Income = require('./models/Income');
const Transfer = require('./models/Transfer');

const LOCAL_URI = 'mongodb://localhost:27017/walet_db';
// The new Atlas cluster URI with your credentials
const REMOTE_URI = 'mongodb+srv://sheljin2003sgs_db_user:oqhTiWV0ceORS6HF@my-finance.ebxtde4.mongodb.net/walet_db?appName=my-finance';

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function migrate() {
    let localData = {};
    let collections = ['User', 'Account', 'Category', 'Debt', 'Expense', 'Goal', 'Income', 'Transfer'];

    try {
        console.log('--- Phase 1: Reading from Local DB ---');
        await mongoose.connect(LOCAL_URI);
        console.log('Connected to Local MongoDB.');

        // Load models explicitly to ensure they are registered with THIS connection
        // Note: mongoose.model registers globally by default, so subsequent connects reuse them
        const models = {
            User: mongoose.model('User'),
            Account: mongoose.model('Account'),
            Category: mongoose.model('Category'),
            Debt: mongoose.model('Debt'),
            Expense: mongoose.model('Expense'),
            Goal: mongoose.model('Goal'),
            Income: mongoose.model('Income'),
            Transfer: mongoose.model('Transfer')
        };

        for (const name of collections) {
            console.log(`Reading ${name}s...`);
            localData[name] = await models[name].find().lean();
            console.log(`Found ${localData[name].length} ${name} records.`);
        }

        await mongoose.disconnect();
        console.log('Disconnected from Local DB.');

        // Small pause to ensure connection cleanup
        await sleep(1000);

        console.log('--- Phase 2: Writing to Atlas Cluster ---');
        await mongoose.connect(REMOTE_URI);
        console.log('Connected to MongoDB Atlas.');

        // Re-acquire models (they use the new default connection now)
        const remoteModels = {
            User: mongoose.model('User'),
            Account: mongoose.model('Account'),
            Category: mongoose.model('Category'),
            Debt: mongoose.model('Debt'),
            Expense: mongoose.model('Expense'),
            Goal: mongoose.model('Goal'),
            Income: mongoose.model('Income'),
            Transfer: mongoose.model('Transfer')
        };

        for (const name of collections) {
            const records = localData[name];
            if (records.length > 0) {
                console.log(`Migrating ${records.length} ${name}s...`);
                try {
                    // Use insertMany with ordered: false to continue if some fail (e.g. duplicates)
                    await remoteModels[name].insertMany(records, { ordered: false });
                    console.log(`Successfully migrated ${name}s.`);
                } catch (err) {
                    if (err.code === 11000) {
                        console.log(`Some ${name} records were skipped (duplicates). This is expected if data exists.`);
                    } else {
                        console.error(`Error migrating ${name}:`, err.message);
                    }
                }
            } else {
                console.log(`No records for ${name}, skipping.`);
            }
        }

        console.log('--- Migration Completed Successfully ---');
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
