import nodemailer, { Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

export const isEmailValid = (email: string): boolean => {
  if (!email) return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  // Simple RFC-compliant-ish check without being overly strict
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const buildTransporter = (): Transporter => {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = Number(process.env.EMAIL_SMTP_PORT || 587);
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;
  const secure = process.env.EMAIL_SMTP_SECURE === "true" || port === 465;
  const allowSelfSigned = process.env.EMAIL_SMTP_ALLOW_SELF_SIGNED === "true";

  if (!host || !user || !pass) {
    throw new Error("Email transport is not fully configured. Please set EMAIL_SMTP_HOST, EMAIL_SMTP_USER, and EMAIL_SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: allowSelfSigned ? { rejectUnauthorized: false } : undefined,
  });
};

export const getEmailTransporter = (): Transporter => {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = buildTransporter();
  return cachedTransporter;
};

export const sendEmail = async (options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}) => {
  const transporter = getEmailTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_SMTP_USER;
  if (!from) {
    throw new Error("EMAIL_FROM or EMAIL_SMTP_USER must be set to send mail.");
  }

  return transporter.sendMail({
    from,
    ...options,
  });
};
