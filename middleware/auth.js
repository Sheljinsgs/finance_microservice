const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // Check DB for session validity (7 days inactivity rule)
        const user = await User.findById(req.user.id);
        
        if (!user) {
             return res.status(401).json({ msg: 'User not found' });
        }

        // Find the specific session
        const sessionIndex = user.sessions.findIndex(s => s.token === token);
        
        if (sessionIndex === -1) {
             return res.status(401).json({ msg: 'Session expired or invalid. Please login again.' });
        }

        const session = user.sessions[sessionIndex];
        const now = new Date();
        const lastActive = new Date(session.lastActive);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        // Check if inactive for > 7 days
        if (now - lastActive > sevenDays) {
            // Remove expired session
            user.sessions.splice(sessionIndex, 1);
            await user.save();
            return res.status(401).json({ msg: 'Session expired due to inactivity. Please login again.' });
        }

        // Update lastActive activity (Touching the session)
        // Optimization: only update if it's been more than 1 hour to reduce DB writes? 
        // User requirement: "if there is 7d not activity... logout or else need to be there"
        // We will update it on every request for strict compliance, or maybe a small buffer like 5 mins. 
        // Let's update it always for simplicity and correctness for now.
        user.sessions[sessionIndex].lastActive = now;
        await user.save();

        next();
    } catch (err) {
        console.log(err);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
