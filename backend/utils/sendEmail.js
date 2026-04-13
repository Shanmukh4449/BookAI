const nodemailer = require('nodemailer');

const sendOTPEmail = async (to, otp) => {
  try {
    const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
});

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Password Reset OTP',
      html: `
        <h2>Reset Password</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>Expires in 10 minutes</p>
      `
    });

    console.log('✅ OTP email sent');
    return true;

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

module.exports = sendOTPEmail;
