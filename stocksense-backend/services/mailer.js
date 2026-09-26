const nodemailer = require('nodemailer');

let transporter = null;

// Initialize Nodemailer transporter (Ethereal test account or custom SMTP)
async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✉️  Using custom SMTP server for email dispatch');
  } else {
    // Generate Ethereal test SMTP account automatically for hackathon testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`✉️  Using Nodemailer Ethereal Test Account: ${testAccount.user}`);
  }
  return transporter;
}

async function sendOtpEmail(toEmail, otpCode, type = 'signup') {
  try {
    const mailTransporter = await getTransporter();
    
    const isReset = type === 'reset';
    const subject = isReset 
      ? '🔒 StockSense Security: Password Reset Verification Code' 
      : '📦 Welcome to StockSense: Email Verification Code';

    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 800;">StockSense</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Enterprise Inventory Management System</p>
        </div>
        
        <div style="background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-top: 0; color: #f8fafc;">${isReset ? 'Password Reset Request' : 'Verify Your Email Address'}</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
            ${isReset 
              ? 'We received a request to reset your StockSense account password. Use the verification code below to authorize the reset:' 
              : 'Thank you for registering with StockSense IMS. Use the 6-digit security code below to verify your email and activate your account:'}
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #818cf8; background: #0f172a; padding: 14px 28px; border-radius: 10px; border: 2px dashed #6366f1; display: inline-block;">
              ${otpCode}
            </span>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0; text-align: center;">
            ⏰ Code expires in <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
        
        <div style="text-align: center; color: #64748b; font-size: 12px;">
          StockSense Automated Security Service • Hackathon 2026
        </div>
      </div>
    `;

    const info = await mailTransporter.sendMail({
      from: '"StockSense IMS Security" <no-reply@stocksense.com>',
      to: toEmail,
      subject,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️  LIVE EMAIL PREVIEW URL: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('Error sending email via Nodemailer:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendOtpEmail };
