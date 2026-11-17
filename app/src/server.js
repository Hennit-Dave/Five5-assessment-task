import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  createInquiry,
  getAllInquiries,
  createUser,
  findUserByEmail,
  verifyUserCredentials,
  DuplicateEmailError
} from './db.js';
import {
  normalizeEmail,
  normalizePassword,
  validateEmail,
  validateName,
  validateSignupPassword
} from './auth.js';
import {
  SignupSchema,
  LoginSchema,
  ResetSchema,
  RecoverySchema,
  OrderLookupSchema,
  VerifyCodeSchema,
  ResendVerificationSchema,
  getFirstErrorMessage
} from './schemas.js';
import { createAuthRateLimiters } from './rateLimit.js';
import { checkPasswordBreached, OUTCOMES as BREACH_OUTCOMES } from './breachCheck.js';
import {
  issueVerificationCode,
  verifyEmailCode,
  assertVerificationSecretConfigured,
  VerificationConfigError,
  EXPIRY_MINUTES
} from './verification.js';
import { enqueueVerificationEmail, sendVerificationEmail } from './email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Set EJS as view engine and configure views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Body parsing middleware for forms and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static assets from public/ directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logger middleware with timing and status code
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Home Route with dynamic inquiries list
app.get('/', (req, res) => {
  try {
    const inquiries = getAllInquiries();
    res.render('home', {
      pageTitle: "Nit's Cut — Bespoke Men's Tailoring",
      metaDescription: "Handcrafted Nigerian native wear, fitted trousers and bespoke shirts.",
      isMarketingPage: true,
      activePath: '/',
      inquiries: inquiries,
      successMessage: null,
      errorMessage: null,
      wrapMode: req.query.wrap || 'good'
    });
  } catch (err) {
    console.error('[Error] Failed to fetch inquiries for home view:', err.message);
    res.status(500).render('home', {
      pageTitle: "Error — Nit's Cut",
      metaDescription: "Error loading Nit's Cut client portal.",
      isMarketingPage: false,
      activePath: '/',
      inquiries: [],
      successMessage: null,
      errorMessage: `Database query failed: ${err.message}`,
      wrapMode: 'good'
    });
  }
});

// Services & Tailoring Process Route (Route 2 for dynamic navigation)
app.get('/services', (req, res) => {
  res.render('services', {
    pageTitle: "Bespoke Tailoring Services — Nit's Cut",
    metaDescription: "Explore our handcrafted Senator native wear, traditional Agbada, and bespoke trousers.",
    isMarketingPage: true,
    activePath: '/services'
  });
});

// Single authentication page (Task 3 Step 1). One route; the ?mode= query parameter selects which
// of the three forms is visible. This replaces the intermediate separate /signup, /login and /reset
// pages, which are kept only in Git history (commit 7da3fce) and in evidence/01-page-count-before.txt.
const AUTH_MODES = {
  signup: { title: "Sign up — Nit's Cut" },
  login: { title: "Log in — Nit's Cut" },
  reset: { title: "Reset password — Nit's Cut" }
};
app.get('/auth', (req, res) => {
  const mode = req.query.mode;
  if (typeof mode !== 'string' || !Object.hasOwn(AUTH_MODES, mode)) {
    return res.redirect(302, '/auth?mode=login');
  }
  res.render('auth', {
    pageTitle: AUTH_MODES[mode].title,
    isMarketingPage: false,
    activePath: '/auth',
    mode,
    authModes: AUTH_MODES,
    scripts: ['/js/auth.js']
  });
});

// Terms of Service Route (Step 2 Draft placeholder awaiting approved source)
app.get('/terms', (req, res) => {
  res.render('terms', {
    pageTitle: "Terms of Service (Assessment Draft) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/terms'
  });
});

// Authentication Endpoints (Task 4 Step 6: Schema Validation at the Boundary)
// Rate limiting (Step 8) runs after body parsing and BEFORE schema validation, hashing
// and database work. It is IP-only, in-memory, and `trust proxy` is intentionally left off.
const authLimiters = createAuthRateLimiters(AUTH_MODES);

// Zod schemas execute at the HTTP boundary immediately after body parsing.
// Passwords are NEVER logged or echoed to response views.
// Downstream handlers use parsed schema output for business actions.

app.post('/auth/signup', ...authLimiters.signup, async (req, res) => {
  const valStart = performance.now();
  const parseResult = SignupSchema.safeParse(req.body || {});
  const valDuration = performance.now() - valStart;
  res.setHeader('X-Validation-Duration-Ms', valDuration.toFixed(4));

  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const rawEmail = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  const safeFormData = { name: rawName, email: rawEmail };

  if (!parseResult.success) {
    const msg = getFirstErrorMessage(parseResult.error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ success: false, error: msg });
    }
    return res.status(400).render('auth', {
      mode: 'signup',
      pageTitle: AUTH_MODES.signup.title,
      isMarketingPage: false,
      activePath: '/auth',
      authModes: AUTH_MODES,
      scripts: ['/js/auth.js'],
      errorMessage: msg,
      formData: safeFormData
    });
  }

  const { name, email, password, termsAccepted } = parseResult.data;

  // Task 4 Step 9: Breached Password Check (k-anonymity hash-prefix lookup)
  // Evaluated strictly after schema validation and strictly before Argon2id hashing or database writes.
  const breachResult = await checkPasswordBreached(password);

  if (breachResult.outcome === BREACH_OUTCOMES.BREACHED) {
    const msg = 'This password has appeared in a known data breach. Please choose a different password to protect your account.';
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ success: false, error: msg });
    }
    return res.status(400).render('auth', {
      mode: 'signup',
      pageTitle: AUTH_MODES.signup.title,
      isMarketingPage: false,
      activePath: '/auth',
      authModes: AUTH_MODES,
      scripts: ['/js/auth.js'],
      errorMessage: msg,
      formData: safeFormData
    });
  }

  if (breachResult.outcome === BREACH_OUTCOMES.UNAVAILABLE) {
    // Fail-closed policy for assessment: return HTTP 503 and create zero accounts
    const msg = 'Password verification is temporarily unavailable. Please try again in a few moments.';
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(503).json({ success: false, error: msg });
    }
    return res.status(503).render('auth', {
      mode: 'signup',
      pageTitle: AUTH_MODES.signup.title,
      isMarketingPage: false,
      activePath: '/auth',
      authModes: AUTH_MODES,
      scripts: ['/js/auth.js'],
      errorMessage: msg,
      formData: safeFormData
    });
  }

  try {
    // Validate verification HMAC secret BEFORE creating any user or verification record
    assertVerificationSecretConfigured();

    const user = await createUser({
      email,
      password,
      fullName: name
    });

    console.log(`[Auth] User created: id=${user.id}, email=${user.email}, role=${user.role}`);

    // Task 4 Step 10: Issue 6-digit verification code and dispatch email.
    // Strict recipient allowlist (TEST_RECIPIENT_EMAIL) is enforced inside sendVerificationEmail / enqueueVerificationEmail
    // before any SMTP connection; neither NODE_ENV nor EMAIL_DELIVERY_MODE can bypass it.
    const codeIssue = issueVerificationCode({ userId: user.id, ignoreCooldown: true });
    const deliveryMode = process.env.EMAIL_DELIVERY_MODE || 'job';

    if (codeIssue.ok && deliveryMode !== 'disabled') {
      if (deliveryMode === 'sync') {
        try {
          await sendVerificationEmail({
            toEmail: user.email,
            fullName: user.fullName,
            code: codeIssue.code,
            expiryMinutes: EXPIRY_MINUTES
          });
        } catch (emailErr) {
          if (emailErr?.code === 'RECIPIENT_NOT_ALLOWED') {
            console.warn(`[Email] Sync delivery blocked before SMTP connection: ${emailErr.message}`);
          } else {
            throw emailErr;
          }
        }
      } else {
        enqueueVerificationEmail({
          toEmail: user.email,
          fullName: user.fullName,
          code: codeIssue.code,
          expiryMinutes: EXPIRY_MINUTES
        });
      }
    }

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(201).json({ success: true, user });
    }

    res.status(201).render('auth-result', {
      pageTitle: "Account Created — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth',
      action: 'signup',
      user,
      termsAccepted,
      notice: "Your client account has been created. In this prototype, persistent sign-in sessions are not yet active."
    });
  } catch (err) {
    if (err instanceof DuplicateEmailError || err.code === 'EMAIL_EXISTS') {
      const msg = 'An account with this email address already exists. Please log in or request a password reset.';
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(409).json({ success: false, error: msg });
      }
      return res.status(409).render('auth', {
        mode: 'signup',
        pageTitle: AUTH_MODES.signup.title,
        isMarketingPage: false,
        activePath: '/auth',
        authModes: AUTH_MODES,
        scripts: ['/js/auth.js'],
        errorMessage: msg,
        formData: safeFormData
      });
    }

    console.error('[Auth Error] Signup failed:', err.message);
    const msg = 'Account registration failed due to an internal server error.';
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, error: msg });
    }
    res.status(500).render('auth', {
      mode: 'signup',
      pageTitle: AUTH_MODES.signup.title,
      isMarketingPage: false,
      activePath: '/auth',
      authModes: AUTH_MODES,
      scripts: ['/js/auth.js'],
      errorMessage: msg,
      formData: safeFormData
    });
  }
});

app.post('/auth/login', ...authLimiters.login, async (req, res) => {
  const valStart = performance.now();
  const parseResult = LoginSchema.safeParse(req.body || {});
  const valDuration = performance.now() - valStart;
  res.setHeader('X-Validation-Duration-Ms', valDuration.toFixed(4));

  const rawEmail = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  const safeFormData = { email: rawEmail };

  if (!parseResult.success) {
    const msg = 'Invalid email or password.';
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(401).json({ success: false, error: msg });
    }
    return res.status(401).render('auth', {
      mode: 'login',
      pageTitle: AUTH_MODES.login.title,
      isMarketingPage: false,
      activePath: '/auth',
      authModes: AUTH_MODES,
      scripts: ['/js/auth.js'],
      errorMessage: msg,
      formData: safeFormData
    });
  }

  const { email, password } = parseResult.data;

  try {
    const user = await verifyUserCredentials(email, password);
    if (!user) {
      const msg = 'Invalid email or password.';
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(401).json({ success: false, error: msg });
      }
      return res.status(401).render('auth', {
        mode: 'login',
        pageTitle: AUTH_MODES.login.title,
        isMarketingPage: false,
        activePath: '/auth',
        authModes: AUTH_MODES,
        scripts: ['/js/auth.js'],
        errorMessage: msg,
        formData: safeFormData
      });
    }

    console.log(`[Auth] User authenticated: id=${user.id}, email=${user.email}, role=${user.role}`);

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(200).json({ success: true, user });
    }

    res.status(200).render('auth-result', {
      pageTitle: "Login Successful — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth',
      action: 'login',
      user,
      notice: "Your details were verified successfully. In this prototype, persistent sign-in sessions are not yet active."
    });
  } catch (err) {
    console.error('[Auth Error] Login failed:', err.message);
    const msg = 'Login failed due to an internal server error.';
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, error: msg });
    }
    res.status(500).render('auth', {
      mode: 'login',
      pageTitle: AUTH_MODES.login.title,
      isMarketingPage: false,
      activePath: '/auth',
      authModes: AUTH_MODES,
      scripts: ['/js/auth.js'],
      errorMessage: msg,
      formData: safeFormData
    });
  }
});

app.post('/auth/reset', ...authLimiters.reset, (req, res) => {
  const valStart = performance.now();
  const parseResult = ResetSchema.safeParse(req.body || {});
  const valDuration = performance.now() - valStart;
  res.setHeader('X-Validation-Duration-Ms', valDuration.toFixed(4));

  const rawEmail = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  const safeFormData = { email: rawEmail };

  if (!parseResult.success) {
    const msg = getFirstErrorMessage(parseResult.error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ success: false, error: msg });
    }
    return res.status(400).render('auth', {
      mode: 'reset',
      pageTitle: AUTH_MODES.reset.title,
      isMarketingPage: false,
      activePath: '/auth',
      authModes: AUTH_MODES,
      scripts: ['/js/auth.js'],
      errorMessage: msg,
      formData: safeFormData
    });
  }

  const { email } = parseResult.data;
  const resetNotice = "If an account exists for this email address, password reset instructions will be sent. In this prototype, automated email sending is not yet active.";

  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(200).json({
      success: true,
      message: resetNotice
    });
  }

  res.status(200).render('auth-result', {
    pageTitle: "Password Reset Requested — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth',
    action: 'reset',
    email,
    notice: resetNotice
  });
});

// Password Reset Recovery Code Demonstration Route (Task 3 Step 5)
// Demonstrates sensitive data shape protection and enumeration prevention
// Email Verification Routes (Task 4 Step 10)
app.get('/auth/verify', (req, res) => {
  const email = typeof req.query.email === 'string' ? normalizeEmail(req.query.email) : '';
  res.render('verify', {
    pageTitle: "Verify Your Email — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth/verify',
    email
  });
});

app.post('/auth/verify', ...authLimiters.verify, (req, res) => {
  const rawEmail = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  const parseResult = VerifyCodeSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    const msg = getFirstErrorMessage(parseResult.error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ success: false, error: msg });
    }
    return res.status(400).render('verify', {
      pageTitle: "Verify Your Email — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth/verify',
      errorMessage: msg,
      email: rawEmail
    });
  }

  const { email, code } = parseResult.data;
  let result;
  try {
    assertVerificationSecretConfigured();
    result = verifyEmailCode({ email, code });
  } catch (err) {
    console.error('[Auth Error] Email verification failed:', err.message);
    const msg = 'Email verification is temporarily unavailable due to a configuration error.';
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, error: msg });
    }
    return res.status(500).render('verify', {
      pageTitle: "Verify Your Email — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth/verify',
      errorMessage: msg,
      email
    });
  }

  if (!result.ok) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ success: false, reason: result.reason, error: result.message });
    }
    return res.status(400).render('verify', {
      pageTitle: "Verify Your Email — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth/verify',
      errorMessage: result.message,
      email
    });
  }

  console.log(`[Auth] Email verified: userId=${result.userId}, email=${result.email}`);

  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(200).json({ success: true, email: result.email, verifiedAt: result.verifiedAt });
  }

  return res.status(200).render('verify-result', {
    pageTitle: "Email Verified — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth/verify',
    email: result.email,
    verifiedAt: result.verifiedAt
  });
});

app.post('/auth/verify/resend', ...authLimiters.resend, (req, res) => {
  const rawEmail = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  const parseResult = ResendVerificationSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    const msg = getFirstErrorMessage(parseResult.error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ success: false, error: msg });
    }
    return res.status(400).render('verify', {
      pageTitle: "Verify Your Email — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth/verify',
      errorMessage: msg,
      email: rawEmail
    });
  }

  const { email } = parseResult.data;

  try {
    assertVerificationSecretConfigured();
  } catch (err) {
    console.error('[Auth Error] Resend verification failed:', err.message);
    const msg = 'Email verification is temporarily unavailable due to a configuration error.';
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, error: msg });
    }
    return res.status(500).render('verify', {
      pageTitle: "Verify Your Email — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth/verify',
      errorMessage: msg,
      email
    });
  }

  const user = findUserByEmail(email);

  if (user && !user.email_verified_at) {
    const issue = issueVerificationCode({ userId: user.id });
    if (!issue.ok && issue.reason === 'COOLDOWN') {
      res.setHeader('Retry-After', String(issue.retryAfterSeconds));
      const msg = `Please wait ${issue.retryAfterSeconds} seconds before requesting a new verification code.`;
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(429).json({ success: false, reason: 'COOLDOWN', retryAfterSeconds: issue.retryAfterSeconds, error: msg });
      }
      return res.status(429).render('verify', {
        pageTitle: "Verify Your Email — Nit's Cut",
        isMarketingPage: false,
        activePath: '/auth/verify',
        errorMessage: msg,
        email
      });
    }

    if (issue.ok && process.env.EMAIL_DELIVERY_MODE !== 'disabled') {
      enqueueVerificationEmail({
        toEmail: user.email,
        fullName: user.full_name,
        code: issue.code,
        expiryMinutes: EXPIRY_MINUTES
      });
    }
  }

  const infoMsg = 'If an unverified account exists for this email address, a new 6-digit verification code has been queued for delivery.';
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(200).json({ success: true, message: infoMsg });
  }

  return res.status(200).render('verify', {
    pageTitle: "Verify Your Email — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth/verify',
    infoMessage: infoMsg,
    email
  });
});

app.get('/auth/recovery', (req, res) => {
  res.render('recovery', {
    pageTitle: "Enter Recovery Code (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth/recovery'
  });
});

app.post('/auth/recovery', (req, res) => {
  const parseResult = RecoverySchema.safeParse(req.body ?? {});
  if (!parseResult.success) {
    const msg = getFirstErrorMessage(parseResult.error);
    return res.status(400).render('recovery', {
      pageTitle: "Enter Recovery Code (Prototype) — Nit's Cut",
      isMarketingPage: false,
      activePath: '/auth/recovery',
      errorMessage: msg
    });
  }
  // Do not log or echo submitted recovery codes or their lengths to result views
  res.status(200).render('recovery-result', {
    pageTitle: "Recovery Submission Received (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth/recovery'
  });
});

// Order Reference Lookup Demonstration Route (Task 3 Step 4)
// Demonstrates input type selection for numerical identifiers (e.g. NC-0042 digits)
app.get('/orders/lookup', (req, res) => {
  const version = req.query.version === 'text' ? 'text' : 'number';
  res.render('order-lookup', {
    pageTitle: "Find Your Order (Reference Demonstration) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/orders/lookup',
    version
  });
});

app.post('/orders/lookup', (req, res) => {
  const parseResult = OrderLookupSchema.safeParse(req.body ?? {});
  if (!parseResult.success) {
    const rawVersion = req.body && req.body.version === 'text' ? 'text' : 'number';
    return res.status(400).render('order-lookup', {
      pageTitle: "Find Your Order (Reference Demonstration) — Nit's Cut",
      isMarketingPage: false,
      activePath: '/orders/lookup',
      version: rawVersion,
      errorMessage: getFirstErrorMessage(parseResult.error)
    });
  }
  const { order_ref, version } = parseResult.data;
  const submittedStr = order_ref;
  res.status(200).render('order-lookup-result', {
    pageTitle: "Order Reference Submitted (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/orders/lookup',
    version,
    submittedValue: submittedStr,
    submittedLength: submittedStr.length,
    numericCoercion: Number(submittedStr)
  });
});

// Inquiry Submission Route (Step 6 Database Form)
app.post('/inquiries', (req, res) => {
  const { clientName, phone, garmentType, fabricChoice, fittingDate } = req.body || {};
  const formData = {
    clientName: typeof clientName === 'string' ? clientName.trim() : '',
    phone: typeof phone === 'string' ? phone.trim() : '',
    garmentType: typeof garmentType === 'string' ? garmentType.trim() : '',
    fabricChoice: typeof fabricChoice === 'string' ? fabricChoice.trim() : '',
    fittingDate: typeof fittingDate === 'string' ? fittingDate.trim() : ''
  };

  // Validation
  if (!formData.clientName || !formData.phone || !formData.garmentType || !formData.fabricChoice || !formData.fittingDate) {
    console.warn('[Validation Error] Missing required fields in inquiry submission');
    const inquiries = [];
    try { inquiries.push(...getAllInquiries()); } catch (_) {}
    return res.status(400).render('home', {
      pageTitle: "Inquiry Error — Nit's Cut",
      activePath: '/',
      inquiries: inquiries,
      successMessage: null,
      errorMessage: "All fields are required to register a bespoke inquiry.",
      formData
    });
  }

  try {
    const record = createInquiry(formData);

    console.log(`[Database Write] 201 Created: Inquiry #${record.id} for "${record.client_name}" (${record.garment_type}) registered at ${record.created_at}`);

    const inquiries = getAllInquiries();

    // Respond with explicit 201 Created status code
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(201).json({ success: true, record });
    }

    res.status(201).render('home', {
      pageTitle: "Inquiry Confirmed — Nit's Cut",
      activePath: '/',
      inquiries: inquiries,
      successMessage: `Bespoke tailoring inquiry #${record.id} successfully recorded for ${record.client_name}! Agreed fitting date: ${record.fitting_date}.`,
      errorMessage: null
    });
  } catch (err) {
    console.error(`[Database Failure] 500 Internal Server Error: Failed to write to inquiries table: ${err.message}`);
    
    // Explicit 500 error reporting — does not disguise failure as false success
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, error: err.message });
    }

    res.status(500).render('home', {
      pageTitle: "Database Error — Nit's Cut",
      activePath: '/',
      inquiries: [],
      successMessage: null,
      errorMessage: `Database write operation failed: ${err.message}. Your record was NOT stored.`
    });
  }
});

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).render('home', {
    pageTitle: "Page Not Found — Nit's Cut",
    metaDescription: "The requested page was not found on Nit's Cut portal.",
    isMarketingPage: false,
    inquiries: [],
    successMessage: null,
    errorMessage: `Route ${req.originalUrl} was not found on this server.`,
    wrapMode: 'good'
  });
});

// General Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] Unhandled server error:`, err);
  res.status(500).send('Internal Server Error');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Nit's Cut Server] Process ${process.pid} listening on port ${PORT}`);
  console.log(`[Nit's Cut Server] Local URL: http://localhost:${PORT}`);
});

export default app;
