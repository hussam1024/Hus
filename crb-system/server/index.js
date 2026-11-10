'use strict';
const path = require('path');
const express = require('express');
const { ensureBase } = require('./seed');
const C = require('./core');
const { auth, admin } = require('./routes/admin');
const workflow = require('./routes/workflow');
const modules = require('./routes/modules');
const collab = require('./routes/collab');

ensureBase();

const app = express();
app.disable('x-powered-by');
if (process.env.CRB_TRUST_PROXY) app.set('trust proxy', 1);

// ---- security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(C.authenticate);

// ---- CSRF guard: every state-changing API call must carry our custom header (cannot be sent cross-site without CORS)
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('X-CRB') !== '1') {
    return res.status(403).json({ error: 'طلب غير موثوق' });
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/api/auth', auth);
app.use('/api', C.requireAuth);
app.use('/api/admin', admin);
app.use('/api', workflow.router);
app.use('/api', modules);
app.use('/api', collab);
app.use('/api', (req, res) => res.status(404).json({ error: 'غير موجود' }));

// ---- frontend
app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html', maxAge: '1h' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// ---- errors
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم' });
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`✅ نظام منتدى الإغاثة والبناء يعمل على: http://localhost:${PORT}`));
