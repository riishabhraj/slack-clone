import nodemailer from 'nodemailer';

type EmailOptions = {
    to: string;
    subject: string;
    text: string;
    html?: string;
};

// Create a transporter using the environment variables
const createTransporter = async () => {
    console.log('Creating email transporter with configuration:', {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: process.env.EMAIL_SERVER_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: '********' // Password masked for logging
        }
    });

    // First try to use the configured SMTP server
    if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
        return nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST,
            port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
            secure: process.env.EMAIL_SERVER_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
        });
    }

    // Fallback to Ethereal for development/testing
    console.log('No email configuration found, falling back to Ethereal test account');
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
};

/**
 * Send an email
 * @param options Email options including recipient, subject, text, and optional HTML content
 * @returns Information about the sent email
 */
export const sendEmail = async (options: EmailOptions) => {
    try {
        const transporter = await createTransporter();

        const fromName = process.env.EMAIL_FROM_NAME || 'Slack Clone';
        const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_SERVER_USER || 'noreply@slackclone.com';
        const from = `"${fromName}" <${fromAddress}>`;

        console.log(`Sending email to: ${options.to}, from: ${from}, subject: ${options.subject}`);

        const info = await transporter.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html || options.text,
        });

        // Always log the email URL if using Ethereal
        if (info.messageId) {
            console.log('Email sent, messageId:', info.messageId);

            // For Ethereal test emails, get the preview URL
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('Email preview URL:', previewUrl);
            }
        }

        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Send an OTP verification email
 * @param email Recipient email address
 * @param otp One-time password
 * @param name Optional user name
 */
export const sendOTPEmail = async (email: string, otp: string, name?: string | null) => {
    const greeting = name ? `Hi ${name},` : 'Hi there,';
    const subject = 'Your verification code for Slack Clone';

    const text = `
${greeting}

Your verification code for Slack Clone is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Regards,
The Slack Clone Team
`;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Slack Clone Verification Code</h2>
  <p>${greeting}</p>
  <p>Your verification code is:</p>
  <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
    ${otp}
  </div>
  <p>This code will expire in 10 minutes.</p>
  <p>If you didn't request this code, please ignore this email.</p>
  <p>Regards,<br>The Slack Clone Team</p>
</div>
`;

    return sendEmail({
        to: email,
        subject,
        text,
        html,
    });
};
