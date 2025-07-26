import { IDocument } from '../models/Document';

interface EmailTemplate {
  subject: string;
  html: string;
}

export const generateShareEmailTemplate = (
  document: IDocument,
  senderName: string,
  permission: string,
  message?: string
): EmailTemplate => {
  const subject = `${senderName} shared a document with you`;
  const html = `
    <h2>Document Shared</h2>
    <p>${senderName} has shared the document "${document.title}" with you.</p>
    ${message ? `<p>Message: ${message}</p>` : ''}
    <p>You can access the document with ${permission} permissions.</p>
  `;

  return { subject, html };
}; 