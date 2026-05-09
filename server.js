const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require('dns');

// Force IPv4 first to fix 'querySrv ECONNREFUSED' on some Windows systems
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Mongoose Configuration
mongoose.set('bufferCommands', false);

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Fail after 5 seconds instead of 30
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error details:', err.message);
  if (err.message.includes('whitelist')) {
    console.error('ACTION REQUIRED: You must whitelist 0.0.0.0/0 in MongoDB Atlas!');
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Finance Microservice API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/income', require('./routes/income'));
app.use('/api/expense', require('./routes/expense'));
app.use('/api/transfer', require('./routes/transfer'));
app.use('/api/debt', require('./routes/debt'));
app.use('/api/goals', require('./routes/goal'));
app.use('/api/category', require('./routes/category'));
app.use('/api/accounts', require('./routes/account'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/export', require('./routes/export'));
app.use('/api/networth', require('./routes/networth'));
app.use('/api/split', require('./routes/split'));

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
