import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from the correct path
const envPath = path.resolve(__dirname, '../../.env');
// console.log('Loading .env file from:', envPath);
dotenv.config({ path: envPath });

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Check if Gmail credentials are configured
const hasGmailConfig = () => {
  // console.log('Checking Gmail configuration...');
  // console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'Not set');
  // console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Missing Gmail credentials in .env file:');
    if (!process.env.GMAIL_USER) console.error('- GMAIL_USER is not set');
    if (!process.env.GMAIL_APP_PASSWORD) console.error('- GMAIL_APP_PASSWORD is not set');
    console.error('Please check if .env file exists at:', envPath);
    return false;
  }
  return true;
};

// Create a transporter using Gmail SMTP
const transporter = hasGmailConfig() 
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })
  : null;

// Verify transporter configuration
if (transporter) {
  transporter.verify(function (error: Error | null, _success: boolean) {
    if (error) {
      console.error('Gmail SMTP configuration error:', error.message);
      console.error('Please check your Gmail configuration:');
      console.error('1. Make sure GMAIL_USER and GMAIL_APP_PASSWORD are set in .env');
      console.error('2. For GMAIL_APP_PASSWORD:');
      console.error('   - Enable 2-Step Verification in your Google Account');
      console.error('   - Generate an App Password for "Mail"');
      console.error('   - Use the 16-character App Password');
    } else {
      // console.log('Email service initialized with Gmail SMTP');
    }
  });
} else {
  console.error('Email service is disabled due to missing Gmail credentials');
}

// Send email function

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!transporter) {
    console.error('Cannot send email: Gmail credentials not configured');
    return;
  }

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      ...options
    };

    await transporter.sendMail(mailOptions);
    // console.log('Email sent successfully to:', options.to);
  } catch (error) {
    console.error('Error sending email:', error instanceof Error ? error.message : error);
    throw error;
  }
};

// Send password reset email
export async function sendPasswordResetEmail(to: string, token: string) {
  if (!transporter) throw new Error('Email transporter not configured');
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const html = `
    <h2>Password Reset Request</h2>
    <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>If you did not request this, please ignore this email.</p>
  `;
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: 'Password Reset Request',
    html
  });
}