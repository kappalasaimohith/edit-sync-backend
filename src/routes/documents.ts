import { Router, Response, NextFunction, RequestHandler } from 'express';
import { Document } from '../models/Document';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateShareEmailTemplate } from '../services/emailTemplates';
import { sendEmail } from '../services/emailService';
// import { IDocument } from '../models/Document';
import mongoose from 'mongoose';
import fileUpload from 'express-fileupload';
import { UploadedFile } from 'express-fileupload';

const router = Router();

// Import document
router.post('/import', fileUpload(), ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!req.files || !req.files.file) {
      throw new AppError('No file uploaded', 400);
    }

    const file = req.files.file as UploadedFile;
    const fileContent = file.data.toString('utf-8');
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
    
    const fileType = req.body.fileType?.toLowerCase();
    if (!['md', 'txt'].includes(fileType)) {
      throw new AppError('Unsupported file type', 400);
    }

    const document = new Document({
      title: fileName,
      content: fileContent,
      fileType, 
      owner: req.user._id,
      collaborators: [],
      isPublic: false,
      lastModified: new Date()
    });

    document.save()
      .then(savedDoc => res.status(201).json(savedDoc))
      .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Get all documents for the authenticated user
router.get('/', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    Document.find({
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    })
    .sort({ lastModified: -1 })
    .then(documents => res.json(documents))
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Create a new document
router.post('/', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { title, content } = req.body;

    const document = new Document({
      title,
      content,
      fileType: 'md', // Default to markdown for new documents
      owner: req.user._id
    });

    document.save()
      .then(savedDoc => res.status(201).json(savedDoc))
      .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Get a specific document
router.get('/:id', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id },
        { isPublic: true }
      ]
    })
    .then(document => {
      if (!document) {
        throw new AppError('Document not found', 404);
      }
      res.json(document);
    })
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Update a document
router.put('/:id', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { title, content, fileType } = req.body;

    Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    })
    .then(document => {
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      document.title = title || document.title;
      document.content = content || document.content;
      // Preserve fileType if provided, otherwise keep existing
      if (fileType && ['md', 'txt', 'docx'].includes(fileType)) {
        document.fileType = fileType;
      }
      document.lastModified = new Date();

      return document.save();
    })
    .then(updatedDoc => res.json(updatedDoc))
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Delete a document
router.delete('/:id', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    })
    .then(document => {
      if (!document) {
        throw new AppError('Document not found', 404);
      }
      return document.deleteOne();
    })
    .then(() => res.status(204).send())
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Duplicate a document
router.post('/:id/duplicate', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: user._id },
        { collaborators: user._id }
      ]
    })
    .then(originalDoc => {
      if (!originalDoc) {
        throw new AppError('Document not found', 404);
      }

      const duplicatedDoc = new Document({
        title: `${originalDoc.title} (Copy)`,
        content: originalDoc.content,
        fileType: originalDoc.fileType || 'md', // Preserve the original file type
        owner: user._id,
        collaborators: [],
        isPublic: false,
        lastModified: new Date()
      });

      return duplicatedDoc.save();
    })
    .then(savedDoc => res.status(201).json(savedDoc))
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Share document with other users
router.post('/:id/share', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { collaboratorIds } = req.body;

    Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    })
    .then(document => {
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      document.collaborators = collaboratorIds;
      return document.save();
    })
    .then(updatedDoc => res.json(updatedDoc))
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Toggle document public status
router.patch('/:id/public', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    })
    .then(document => {
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      document.isPublic = !document.isPublic;
      return document.save();
    })
    .then(updatedDoc => res.json(updatedDoc))
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Get shared users for a document
router.get('/:id/users', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!req.params.id) {
      throw new AppError('Document ID is required', 400);
    }

    let documentId;
    try {
      documentId = new mongoose.Types.ObjectId(req.params.id);
    } catch (error) {
      throw new AppError('Invalid document ID format', 400);
    }

    Document.findById(documentId)
      .then(document => {
        if (!document) {
          throw new AppError('Document not found', 404);
        }

        const hasAccess = document.owner.equals(user._id) || 
                         document.collaborators.some(id => id.equals(user._id));
        
        if (!hasAccess) {
          throw new AppError('You do not have access to this document', 403);
        }

        return User.find({
          $or: [
            { _id: document.owner },
            { _id: { $in: document.collaborators } }
          ]
        }).select('_id email name');
      })
      .then(users => {
        const sharedUsers = users.map(sharedUser => ({
          id: sharedUser._id.toString(),
          email: sharedUser.email,
          permission: sharedUser._id.equals(user._id) ? 'owner' : 'collaborator',
          avatar: sharedUser.name ? sharedUser.name.charAt(0).toUpperCase() : sharedUser.email.charAt(0).toUpperCase()
        }));
        res.json(sharedUsers);
      })
      .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Invite user to document
router.post('/:id/invite', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { email, permission } = req.body;

    Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    })
    .then(document => {
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      return User.findOne({ email })
        .then(user => {
          if (!user) {
            const newUser = new User({
              email,
              name: email.split('@')[0],
              isTemporary: true
            });
            return newUser.save();
          }
          return user;
        })
        .then(user => {
          if (!document.collaborators.includes(user._id)) {
            document.collaborators.push(user._id);
            return document.save().then(() => user);
          }
          return user;
        });
    })
    .then(user => {
      res.json({
        id: user._id,
        email: user.email,
        permission,
        avatar: user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
      });
    })
    .catch(error => next(error));
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Send share email
router.post('/:id/share-email', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { email, permission, message } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    Document.findOne({
      _id: req.params.id,
      owner: user._id
    })
    .then(foundDocument => {
      if (!foundDocument) {
        throw new AppError('Document not found', 404);
      }

      const emailTemplate = generateShareEmailTemplate(
        foundDocument,
        user.name || user.email,
        permission,
        message
      );

      return sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
    })
    .then(() => {
      res.status(200).json({
        success: true,
        message: 'Share email sent successfully'
      });
    })
    .catch(error => {
      console.error('Email sending error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send email. Please check your email configuration.'
      });
    });
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Remove user from document
router.delete('/:id/users/:userId', ((req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    let documentId, userId;
    try {
      documentId = new mongoose.Types.ObjectId(req.params.id);
      userId = new mongoose.Types.ObjectId(req.params.userId);
    } catch (error) {
      throw new AppError('Invalid document or user ID format', 400);
    }

    // console.log('[Backend] Removing user from document:', {
    //   documentId: documentId.toString(),
    //   userId: userId.toString(),
    //   currentUser: user._id.toString()
    // });

    // First find the document by ID only
    Document.findById(documentId)
      .then(document => {
        if (!document) {
          throw new AppError('Document not found', 404);
        }

        // Check if the current user is the owner
        if (!document.owner.equals(user._id)) {
          throw new AppError('Only the document owner can remove collaborators', 403);
        }

        if (userId.equals(document.owner)) {
          throw new AppError('Cannot remove the document owner', 403);
        }

        // Check if the user is a collaborator using ObjectId comparison
        const isCollaborator = document.collaborators.some(id => id.equals(userId));
        
        if (isCollaborator) {
          // Remove the user from collaborators using ObjectId comparison
          document.collaborators = document.collaborators.filter(
            id => !id.equals(userId)
          );
          return document.save();
        } else {
          throw new AppError('User is not a collaborator of this document', 404);
        }
      })
      .then(() => res.status(204).send())
      .catch(error => {
        console.error('[Backend] Error removing user:', error);
        next(error);
      });
  } catch (error) {
    console.error('[Backend] Error in remove user route:', error);
    next(error);
  }
}) as RequestHandler);

export default router; 