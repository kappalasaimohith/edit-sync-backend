import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { FileArray } from 'express-fileupload';
import { Document } from 'mongoose';

export interface AuthRequest extends Request {
  user?: Document & IUser;
  files?: FileArray;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here') as { userId: string };
    const user = await User.findOne({ _id: decoded.userId });

    if (!user) {
      throw new Error();
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(401).json({ message: 'Please authenticate' });
  }
}; 