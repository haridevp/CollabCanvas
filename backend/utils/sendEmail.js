const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // This ensures that whichever URL is provided (verification or reset) is used
  const targetUrl = options.verificationUrl || options.resetUrl;

  const mailOptions = {
    from: `"Collaborative Canvas" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: `
      <div style="font-family: sans-serif; text-align: center;">
        <h2>Action Required</h2>
        <p>Please click the button below:</p>
        <a href="${targetUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirm</a>
        <p>Or copy this link: ${targetUrl}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;