import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Helper to sign web tokens bound to unique user ID instances
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
};

// @desc    Register a brand new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'An account is already linked to this email address.' });
    }

    const user = await User.create({ name, email, password });
    
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    // CRITICAL DEBUG: Print out the exact blocker to the server terminal
    console.error("❌ CRITICAL REGISTRATION ERROR:", error);

    // Return the actual Mongoose, validation, or driver error to the client screen
    res.status(400).json({ 
      error: error.message || 'Failed to complete registration due to missing parameters.' 
    });
  }
};

// @desc    Authenticate user credentials & issue JWT token handshake
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid authentication credentials. Access denied.' });
    }
  } catch (error) {
    // CRITICAL DEBUG: Print out the exact login pipeline blocker to the server terminal
    console.error("❌ CRITICAL LOGIN ERROR:", error);

    res.status(500).json({ 
      error: error.message || 'Internal runtime server authentication pipeline failure.' 
    });
  }
};