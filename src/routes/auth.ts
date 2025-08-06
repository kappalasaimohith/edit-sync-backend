import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
// import mongoose from 'mongoose';
import { sendEmail, sendPasswordResetEmail } from '../services/emailService';

const router = Router();

// Input validation middleware
const validateRegistration = (req: Request, _res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  try {
    // Check if all required fields are present
    if (!email || !password || !name) {
      throw new AppError('All fields (email, password, name) are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Validate password strength
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Validate name
    if (name.trim().length < 2) {
      throw new AppError('Name must be at least 2 characters long', 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Register new user
router.post('/register', validateRegistration, async (req, res, next) => {
  // console.log('[DEBUG] Register request received:', { email: req.body.email, name: req.body.name });
  
  try {
    const { email, password, name } = req.body;
    // console.log('[DEBUG] Processing registration for:', email);

    // Check if user already exists
    // console.log('[DEBUG] Checking if user exists:', email);
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // console.log('[DEBUG] User already exists:', email);
      throw new AppError('Email already registered', 400);
    }
    // console.log('[DEBUG] No existing user found, proceeding with registration');

    // Create new user
    // console.log('[DEBUG] Creating new user document');
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: name.trim()
    });

    // console.log('[DEBUG] Saving user to database');
    await user.save();
    // console.log('[DEBUG] User saved successfully:', user._id);

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to EditSync!',
        html: `<h2>Welcome, ${user.name}!</h2><p>Thank you for registering at EditSync. We're excited to have you on board.</p>`
      });
      // console.log('[DEBUG] Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('[DEBUG] Failed to send welcome email:', emailError);
    }

    // Generate JWT token
    // console.log('[DEBUG] Generating JWT token');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );
    // console.log('[DEBUG] JWT token generated successfully');

    // console.log('[DEBUG] Registration successful, sending response');
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
} catch (error) {
  console.error('[DEBUG] Login error:', error);
  next(error);
}
});

// Request password reset
router.post('/request-reset', async (req, res, next) => {
  const { email } = req.body;
  try {
    if (!email) throw new AppError('Email is required', 400);
    const user = await User.findOne({ email });
    if (!user) throw new AppError('No user found with that email', 404);

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(user.email, token);
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next) => {
  // console.log('[DEBUG] Login request received:', { email: req.body.email });
  
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // console.log('[DEBUG] Processing login for:', email);

    // Find user
    // console.log('[DEBUG] Finding user in database');
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // console.log('[DEBUG] User not found:', email);
      throw new AppError('Invalid email or password', 401);
    }
    // console.log('[DEBUG] User found:', user._id);

    // Check password
    // console.log('[DEBUG] Comparing passwords');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // console.log('[DEBUG] Password mismatch for user:', email);
      throw new AppError('Invalid email or password', 401);
    }
    // console.log('[DEBUG] Password verified successfully');

    // Generate JWT token
    // console.log('[DEBUG] Generating JWT token');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );
    // console.log('[DEBUG] JWT token generated successfully');

    // console.log('[DEBUG] Login successful, sending response');
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('[DEBUG] Login error:', error);
    next(error);
  }
});

// Reset password
router.post('/reset-password', async (req, res, next) => {
  const { token, password } = req.body;
  try {
    if (!token || !password) throw new AppError('Token and new password are required', 400);
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
    if (!user) throw new AppError('Invalid or expired token', 400);

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    res.json({ message: 'Password has been reset' });
  } catch (error) {
    next(error);
  }
});

export default router;