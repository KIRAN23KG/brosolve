// src/services/notifications.js
const nodemailer = require('nodemailer');

// Email notification service
async function sendEmail(to, subject, html) {
  if (!process.env.MAILER_SMTP_HOST || !process.env.MAILER_USER || !process.env.MAILER_PASS) {
    return { sent: false, reason: 'Email config missing' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAILER_SMTP_HOST,
      port: parseInt(process.env.MAILER_SMTP_PORT || '587'),
      secure: process.env.MAILER_SMTP_PORT === '465',
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.MAILER_FROM || 'BROSolve <noreply@brosolve.example>',
      to,
      subject,
      html
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { sent: false, error: error.message };
  }
}

// WhatsApp notification service (Twilio-friendly)
async function sendWhatsApp(to, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    return { sent: false, reason: 'WhatsApp config missing' };
  }

  try {
    // Twilio client would be initialized here if twilio package is installed
    // For now, return a placeholder that can be extended
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    // Placeholder - actual implementation would use twilio client
    // const client = require('twilio')(accountSid, authToken);
    // const result = await client.messages.create({
    //   from: `whatsapp:${from}`,
    //   to: `whatsapp:${to}`,
    //   body: message
    // });

    return { sent: true, message: 'WhatsApp notification queued (Twilio integration needed)' };
  } catch (error) {
    console.error('WhatsApp send error:', error.message);
    return { sent: false, error: error.message };
  }
}

// Send complaint created notification
async function notifyComplaintCreated(complaint, user) {
  const emailSubject = `New Complaint: ${complaint.title}`;
  const emailHtml = `
    <h2>New Complaint Created</h2>
    <p><strong>Title:</strong> ${complaint.title}</p>
    <p><strong>Category:</strong> ${complaint.category}</p>
    <p><strong>Description:</strong> ${complaint.description}</p>
    <p><strong>Raised by:</strong> ${user.name} (${user.email})</p>
  `;

  const emailResult = await sendEmail(user.email, emailSubject, emailHtml);
  
  if (user.phone) {
    const whatsappMessage = `New complaint created: ${complaint.title}`;
    await sendWhatsApp(user.phone, whatsappMessage);
  }

  return { email: emailResult };
}

// Send complaint solved notification
async function notifyComplaintSolved(complaint, user) {
  const emailSubject = `Complaint Resolved: ${complaint.title}`;
  const emailHtml = `
    <h2>Your Complaint Has Been Resolved</h2>
    <p><strong>Title:</strong> ${complaint.title}</p>
    <p><strong>Status:</strong> Resolved</p>
    <p>Thank you for using BROSolve!</p>
  `;

  const emailResult = await sendEmail(user.email, emailSubject, emailHtml);
  
  if (user.phone) {
    const whatsappMessage = `Your complaint "${complaint.title}" has been resolved.`;
    await sendWhatsApp(user.phone, whatsappMessage);
  }

  return { email: emailResult };
}

module.exports = {
  sendEmail,
  sendWhatsApp,
  notifyComplaintCreated,
  notifyComplaintSolved
};

