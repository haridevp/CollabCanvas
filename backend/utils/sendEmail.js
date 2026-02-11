/**
 * @fileoverview Email utility using Nodemailer for sending verification and password reset emails.
 */

// Import nodemailer library for SMTP transport and email sending
const nodemailer = require('nodemailer');
const https = require('https');

/**
 * Send an email using Resend HTTP API (primary) or SMTP fallback.
 * Resend uses HTTPS (port 443) — works on all hosting platforms.
 */
const sendEmail = async (options) => {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    return sendWithResend(options, resendApiKey);
  }

  // Fallback to SMTP (for local dev or if no APIs configured)
  return sendWithSMTP(options);
};

/**
 * Send via Resend HTTP API (https://resend.com)
 */
const sendWithResend = (options, apiKey) => {
  return new Promise((resolve, reject) => {
    const senderEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';
    const targetUrl = options.verificationUrl || options.resetUrl;

    const payload = JSON.stringify({
      from: `Collaborative Canvas <${senderEmail}>`,
      to: [options.email],
      subject: options.subject,
      html: `
        <div style="font-family: sans-serif; text-align: center;">
          <h2>Action Required</h2>
          <p>Please click the button below:</p>
          <a href="${targetUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirm</a>
          <p>Or copy this link: ${targetUrl}</p>
        </div>
      `,
    });

    console.log(`Sending email via Resend API from: ${senderEmail} to: ${options.email}`);

    const reqOptions = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log('Resend API response:', res.statusCode, body);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Email sent via Resend API');
          resolve(body);
        } else {
          console.error('❌ Resend API error:', res.statusCode, body);
          reject(new Error(`Resend API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Resend request error:', err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
};

/**
 * Fallback: Send via SMTP (nodemailer)
 */
const sendWithSMTP = async (options) => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = (process.env.EMAIL_USER || '').trim();
  const smtpPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

  // Log the connection attempt details (excluding password) for server logs
  console.log(`Attempting to send email via SMTP (${smtpHost}:${smtpPort}) from: ${smtpUser} to: ${options.email}`);

  // Initialize the Nodemailer transporter with detailed connection settings
  const transporter = nodemailer.createTransport({
    // Set SMTP host
    host: smtpHost,
    // Set SMTP port
    port: smtpPort,
    // Use startTLS (secure: false for port 587)
    secure: smtpPort === 465,
    // Set connection timeout to 10 seconds
    connectionTimeout: 10000,
    // Set socket inactivity timeout to 10 seconds
    socketTimeout: 10000,
    // Allow legacy SSL support if needed by the provider
    tls: {
      // Let Node.js negotiate the best cipher automatically
      rejectUnauthorized: false, // Allow self-signed certs in dev
    },
    // Enable internal logging for debugging
    logger: true,
    // Enable debug mode to see full communication logs
    debug: true,
    // Force IPv4 to prevent delays from IPv6 lookup failures
    // socket: {
    //   family: 4
    // },
    // Set authentication credentials
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const targetUrl = options.verificationUrl || options.resetUrl;

  // Build the email object with sender, recipient, subject, and HTML body
  const mailOptions = {
    // Specify the display name and sender address
    from: `"Collaborative Canvas" <${smtpUser}>`,
    // Target recipient
    to: options.email,
    // Subject line
    subject: options.subject,
    // Use a basic HTML template for the message body
    html: `
      <div style="font-family: sans-serif; text-align: center;">
        <h2>Action Required</h2>
        <p>Please click the button below:</p>
        <a href="${targetUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirm</a>
        <p>Or copy this link: ${targetUrl}</p>
      </div>
    `,
  };

  try {
    // Attempt to send the email using the configured transporter
    const info = await transporter.sendMail(mailOptions);
    // Log the successful message ID returned by the SMTP server
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    // Log full error details if email delivery fails
    console.error("Error sending email:", error);
    // Re-throw the error to allow the calling function to handle it
    throw error;
  }
};

// Export the sendEmail function for use in controllers (e.g., auth controller)
module.exports = sendEmail;