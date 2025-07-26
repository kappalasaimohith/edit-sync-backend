import mongoose, { Document as MongooseDocument, Schema } from 'mongoose';

export interface IDocument extends MongooseDocument {
  title: string;
  content: string;
  fileType: 'md' | 'txt' | 'docx';
  owner: mongoose.Types.ObjectId;
  collaborators: mongoose.Types.ObjectId[];
  isPublic: boolean;
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    default: ''
  },
  fileType: {
    type: String,
    enum: ['md', 'txt', 'docx'],
    default: 'md'
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexing
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ collaborators: 1, createdAt: -1 });

export const Document = mongoose.model<IDocument>('Document', documentSchema); 