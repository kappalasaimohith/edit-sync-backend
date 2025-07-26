import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedDocument extends Document {
  documentId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  isPublic: boolean;
  permission: 'view' | 'edit' | 'comment';
  allowComments: boolean;
  expiresAt?: Date;
  sharedUsers: Array<{
    userId: mongoose.Types.ObjectId;
    email: string;
    permission: 'view' | 'edit' | 'comment';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const sharedDocumentSchema = new Schema({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  permission: {
    type: String,
    enum: ['view', 'edit', 'comment'],
    default: 'view'
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  sharedUsers: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      required: true
    },
    permission: {
      type: String,
      enum: ['view', 'edit', 'comment'],
      default: 'view'
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
sharedDocumentSchema.index({ documentId: 1 });
sharedDocumentSchema.index({ ownerId: 1 });
sharedDocumentSchema.index({ 'sharedUsers.email': 1 });

export const SharedDocument = mongoose.model<ISharedDocument>('SharedDocument', sharedDocumentSchema);