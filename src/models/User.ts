import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // console.log('[DEBUG] Pre-save hook triggered for user:', this.email);
  
  if (!this.isModified('password')) {
    // console.log('[DEBUG] Password not modified, skipping hash');
    return next();
  }
  
  try {
    // console.log('[DEBUG] Generating salt for password hash');
    const salt = await bcrypt.genSalt(10);
    // console.log('[DEBUG] Hashing password');
    this.password = await bcrypt.hash(this.password, salt);
    // console.log('[DEBUG] Password hashed successfully');
    next();
  } catch (error: unknown) {
    // console.error('[DEBUG] Error in password hashing:', error);
    next(error as import('mongoose').CallbackError);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // console.log('[DEBUG] Comparing password for user:', this.email);
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    // console.log('[DEBUG] Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    // console.error('[DEBUG] Error in password comparison:', error);
    throw error;
  }
};

export const User = mongoose.model<IUser>('User', userSchema);