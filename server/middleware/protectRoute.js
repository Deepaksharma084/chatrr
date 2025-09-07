import jwt from 'jsonwebtoken';
import User from '../models/users-model.js';

const protectRoute = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized - No Token Provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ error: 'Unauthorized - Invalid Token' });
        }

        // Attach the user to the request object, just like Passport used to.
        req.user = await User.findById(decoded.userId).select('-password');
        next();

    } catch (error) {
        console.error("Error in protectRoute middleware", error);
        res.status(401).json({ error: 'Unauthorized - Invalid Token' });
    }
};

export default protectRoute;
