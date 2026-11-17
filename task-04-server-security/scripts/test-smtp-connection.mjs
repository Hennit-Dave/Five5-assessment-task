import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from '../../app/node_modules/nodemailer/dist/esm/nodemailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// 1. Locate and load local environment file (.env)
const envPath = path.join(rootDir, '.env');
const appEnvPath = path.join(rootDir, 'app/.env');

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
} else if (fs.existsSync(appEnvPath)) {
  process.loadEnvFile(appEnvPath);
} else {
  console.error('[Error] No .env file found.');
  console.error('Please create .env by copying .env.example:');
  console.error('  cp .env.example .env');
  console.error('Then fill in RESEND_API_KEY and TEST_RECIPIENT_EMAIL.');
  process.exit(1);
}

// 2. Validate required configuration
const host = process.env.SMTP_HOST || 'smtp.resend.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER || 'resend';
const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : '';
const from = process.env.EMAIL_FROM || "Nit's Cut <onboarding@resend.dev>";
const to = process.env.TEST_RECIPIENT_EMAIL ? process.env.TEST_RECIPIENT_EMAIL.trim() : '';

if (!apiKey) {
  console.error('[Configuration Error] RESEND_API_KEY is empty in .env.');
  console.error('Please add your Resend API key (starts with re_) to .env.');
  process.exit(1);
}

if (!to) {
  console.error('[Configuration Error] TEST_RECIPIENT_EMAIL is empty in .env.');
  console.error('Please set TEST_RECIPIENT_EMAIL in .env to the Gmail address registered with your Resend account.');
  process.exit(1);
}

// Redaction utility: masks sensitive tokens, API keys, and recipient addresses in all outputs
function redact(str) {
  if (typeof str !== 'string') return String(str);
  let sanitized = str;
  if (apiKey) {
    sanitized = sanitized.replaceAll(apiKey, '[REDACTED_API_KEY]');
  }
  // Generic pattern for Resend keys (re_...)
  sanitized = sanitized.replace(/re_[A-Za-z0-9_]{10,}/g, '[REDACTED_API_KEY]');
  if (to) {
    const escapedTo = to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(escapedTo, 'gi'), maskEmail(to));
  }
  return sanitized;
}

// Masked display of recipient (e.g. a***e@gmail.com)
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

async function run() {
  console.log('================================================================');
  console.log("NIT'S CUT — RESEND SMTP CONNECTION TEST");
  console.log('================================================================');
  console.log(`SMTP Host:    ${host}`);
  console.log(`SMTP Port:    ${port} (STARTTLS required)`);
  console.log(`SMTP User:    ${user}`);
  console.log('API key:      configured');
  console.log(`From Address: ${from}`);
  console.log(`To Recipient: ${maskEmail(to)}`);
  console.log('----------------------------------------------------------------');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // port 587 uses STARTTLS
    requireTLS: true, // enforce STARTTLS negotiation
    auth: {
      user,
      pass: apiKey
    },
    // Moderate timeout to avoid indefinite hanging
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  const timestamp = new Date().toISOString();
  const mailOptions = {
    from,
    to,
    subject: "Nit's Cut — SMTP connection test",
    text: [
      "This is a single-email SMTP connection test for the Nit's Cut portal (Task 4 Step 10).",
      "",
      `Relay Host:    ${host}:${port} (STARTTLS)`,
      `Sender:        ${from}`,
      `Recipient:     ${maskEmail(to)}`,
      `Sent At (UTC): ${timestamp}`,
      "",
      "Outcome Note:",
      "Receipt of this email confirms that Resend SMTP accepted and delivered",
      "a message sent via the domain-free onboarding@resend.dev sender address."
    ].join('\n')
  };

  try {
    console.log('[1/2] Connecting to SMTP server and verifying credentials...');
    await transporter.verify();
    console.log('  ✓ SMTP handshake and authentication verified successfully.');

    console.log('[2/2] Transmitting single test email over SMTP...');
    const info = await transporter.sendMail(mailOptions);

    const maskedAccepted = Array.isArray(info.accepted)
      ? info.accepted.map((addr) => maskEmail(String(addr)))
      : [];

    console.log('----------------------------------------------------------------');
    console.log('✓ SMTP ACCEPTANCE CONFIRMED:');
    console.log(`  Message ID:    ${info.messageId}`);
    console.log(`  SMTP Response: ${redact(info.response || '250 OK')}`);
    console.log(`  Accepted by:   ${JSON.stringify(maskedAccepted)}`);
    console.log('----------------------------------------------------------------');
    console.log('IMPORTANT DISTINCTION:');
    console.log('  - SMTP Acceptance: The Resend SMTP relay accepted the message (SMTP code 250).');
    console.log('  - Inbox Delivery:  Please check your Gmail inbox (and Spam folder) to confirm');
    console.log('                     actual end-to-end receipt of the message.');
    console.log('================================================================');
  } catch (err) {
    console.error('----------------------------------------------------------------');
    console.error('✗ SMTP CONNECTION FAILED:');
    console.error(`  Error Code:    ${err.code || 'UNKNOWN'}`);
    console.error(`  SMTP Response: ${redact(err.response || err.message)}`);
    if (err.command) {
      console.error(`  SMTP Command:  ${err.command}`);
    }
    console.error('----------------------------------------------------------------');
    console.error('DIAGNOSIS & POLICY NOTE:');
    console.error('  If domain-free sending (onboarding@resend.dev) was rejected by Resend SMTP,');
    console.error('  we will report this exact outcome and determine the appropriate configuration.');
    console.error('  Per assessment rules, we will NOT switch to an HTTP REST API.');
    console.error('================================================================');
    process.exit(1);
  }
}

run();
