import { Router, Response, NextFunction, RequestHandler } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Get current user profile
router.get('/me', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Update current user profile
router.put('/me', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { name, email } = req.body;

    // Check if email is already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Search users
router.get('/search', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required', 400);
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude current user
    }).select('_id name email');

    res.json(users);
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Get user by ID
router.get('/:id', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await User.findById(req.params.id).select('_id name email');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Delete current user account
router.delete('/me', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    await user.deleteOne();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

export default router;