import nodemailer from 'nodemailer';

type EmailOptions = {
    to: string;
    subject: string;
    text: string;
    html?: string;
};

// Create a transporter
// In production, you would use OAuth2 or API keys instead of this test account
const createTransporter = async () => {
    // For development/testing, use a test account
    if (process.env.NODE_ENV !== 'production') {
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
    }

    // For production, use environment variables
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
            // For OAuth2:
            // type: 'OAuth2',
            // clientId: process.env.OAUTH_CLIENT_ID,
            // clientSecret: process.env.OAUTH_CLIENT_SECRET,
            // refreshToken: process.env.OAUTH_REFRESH_TOKEN,
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
        const info = await transporter.sendMail({
            from: `"Slack Clone" <${process.env.EMAIL_FROM || 'noreply@slackclone.com'}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html || options.text,
        });

        if (process.env.NODE_ENV !== 'production') {
            // In development, log the test URL to view the email
            console.log('Email sent: %s', nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
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
