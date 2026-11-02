import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInquiry, getAllInquiries } from './db.js';

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
      theme: 'dark',
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
      theme: 'dark',
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
    activePath: '/services',
    theme: 'dark'
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
    theme: 'dark',
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
    activePath: '/terms',
    theme: 'dark'
  });
});

// Prototype Auth Form POST Handlers (Task 3 Step 2)
// Uses explicit HTTP POST to keep credentials and personal details out of URLs and query logs.
app.post('/auth/signup', (req, res) => {
  const { name, email, terms } = req.body || {};
  // Explicitly avoid logging password; pass status to prototype response view
  res.status(200).render('auth-result', {
    pageTitle: "Signup Received (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth',
    theme: 'dark',
    action: 'signup',
    name: typeof name === 'string' ? name.trim() : '',
    email: typeof email === 'string' ? email.trim() : '',
    termsAccepted: terms === 'on' || terms === 'true'
  });
});

app.post('/auth/login', (req, res) => {
  const { email } = req.body || {};
  // Explicitly avoid logging password
  res.status(200).render('auth-result', {
    pageTitle: "Login Received (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth',
    theme: 'dark',
    action: 'login',
    email: typeof email === 'string' ? email.trim() : ''
  });
});

app.post('/auth/reset', (req, res) => {
  const { email } = req.body || {};
  res.status(200).render('auth-result', {
    pageTitle: "Reset Requested (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth',
    theme: 'dark',
    action: 'reset',
    email: typeof email === 'string' ? email.trim() : ''
  });
});

// Password Reset Recovery Code Demonstration Route (Task 3 Step 5)
// Demonstrates sensitive data shape protection and enumeration prevention
app.get('/auth/recovery', (req, res) => {
  res.render('recovery', {
    pageTitle: "Enter Recovery Code (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth/recovery',
    theme: 'dark'
  });
});

app.post('/auth/recovery', (req, res) => {
  // Do not log or echo submitted recovery codes or their lengths to result views
  res.status(200).render('recovery-result', {
    pageTitle: "Recovery Submission Received (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/auth/recovery',
    theme: 'dark'
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
    theme: 'dark',
    version
  });
});

app.post('/orders/lookup', (req, res) => {
  const { order_ref, version } = req.body || {};
  const submittedStr = typeof order_ref === 'string' ? order_ref : String(order_ref ?? '');
  res.status(200).render('order-lookup-result', {
    pageTitle: "Order Reference Submitted (Prototype) — Nit's Cut",
    isMarketingPage: false,
    activePath: '/orders/lookup',
    theme: 'dark',
    version: version || 'number',
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
      theme: 'dark',
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
      theme: 'dark',
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
      theme: 'dark',
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
    theme: 'dark',
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
