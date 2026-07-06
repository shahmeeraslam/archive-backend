import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // Check for token in the Authorization header (Format: Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from the string
      token = req.headers.authorization.split(' ')[1];

      // Edge Case Guard: Catch literal string variants of missing tokens sent by frontend state mismatch
      if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ error: 'No authorization credentials token detected or token is uninitialized.' });
      }

      // Decode and verify the token signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user profile from database and attach it to the request object (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ error: 'User node not found. Access denied.' });
      }

      // Move forward to the controller logic
      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      return res.status(401).json({ error: 'Session authentication signature has expired or is invalid.' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No authorization credentials token detected.' });
  }
};