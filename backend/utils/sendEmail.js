const nodemailer = require('nodemailer');

const sendOTPEmail = async (to, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
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
};

module.exports = sendOTPEmail;