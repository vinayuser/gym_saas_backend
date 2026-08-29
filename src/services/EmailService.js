import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let transporter;

const isSmtpConfigured = () =>
  Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const getTransporter = () => {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }
  return transporter;
};

export const sendMail = async ({ to, subject, text, html, replyTo }) => {
  const mailOptions = {
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
    replyTo,
  };

  const transport = getTransporter();
  if (!transport) {
    logger.info('SMTP not configured — email logged only', { to, subject });
    return { delivered: false, mocked: true };
  }

  await transport.sendMail(mailOptions);
  return { delivered: true, mocked: false };
};

const CATEGORY_LABELS = {
  GENERAL: 'General',
  BILLING_SUBSCRIPTION: 'Billing & subscription',
  PLAN_CHANGE: 'Plan change',
  TECHNICAL: 'Technical issue',
  ACCOUNT_ACCESS: 'Account access',
  FEATURE_REQUEST: 'Feature request',
};

export const sendSupportTicketEmail = async ({ ticket, tenant, user }) => {
  const categoryLabel = CATEGORY_LABELS[ticket.category] || ticket.category;
  const tenantLine = tenant?.name ? `Business: ${tenant.name}\n` : '';
  const roleLine = user?.role ? `Role: ${user.role}\n` : '';

  const text = [
    'New FitSphere Pro support request',
    '',
    `Ticket ID: ${ticket.id}`,
    `Category: ${categoryLabel}`,
    `Subject: ${ticket.subject}`,
    '',
    tenantLine,
    `From: ${ticket.senderName || '—'} <${ticket.senderEmail}>`,
    roleLine,
    '—'.repeat(40),
    '',
    ticket.message,
    '',
    '—'.repeat(40),
    `Submitted: ${new Date(ticket.createdAt).toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <h2>New FitSphere Pro support request</h2>
    <p><strong>Ticket ID:</strong> ${ticket.id}</p>
    <p><strong>Category:</strong> ${categoryLabel}</p>
    <p><strong>Subject:</strong> ${ticket.subject}</p>
    ${tenant?.name ? `<p><strong>Business:</strong> ${tenant.name}</p>` : ''}
    <p><strong>From:</strong> ${ticket.senderName || '—'} &lt;${ticket.senderEmail}&gt;</p>
    ${user?.role ? `<p><strong>Role:</strong> ${user.role}</p>` : ''}
    <hr />
    <pre style="white-space:pre-wrap;font-family:inherit">${ticket.message}</pre>
  `;

  const result = await sendMail({
    to: env.supportEmail,
    replyTo: ticket.senderEmail,
    subject: `[FitSphere Support] ${categoryLabel} — ${ticket.subject}`,
    text,
    html,
  });

  if (result.delivered) {
    await sendMail({
      to: ticket.senderEmail,
      subject: `We received your request: ${ticket.subject}`,
      text: [
        `Hi ${ticket.senderName || 'there'},`,
        '',
        'Thank you for contacting FitSphere Pro support. We received your message and will respond within 1–2 business days.',
        '',
        `Reference: ${ticket.id}`,
        `Subject: ${ticket.subject}`,
        '',
        '— FitSphere Pro Support',
      ].join('\n'),
      html: `
        <p>Hi ${ticket.senderName || 'there'},</p>
        <p>Thank you for contacting FitSphere Pro support. We received your message and will respond within <strong>1–2 business days</strong>.</p>
        <p><strong>Reference:</strong> ${ticket.id}<br />
        <strong>Subject:</strong> ${ticket.subject}</p>
        <p>— FitSphere Pro Support</p>
      `,
    }).catch((err) => logger.warn('Support confirmation email failed', { err: err.message }));
  }

  return result;
};
