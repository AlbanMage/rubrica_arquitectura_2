/**
 * Under Caps - Servidor principal
 * Arquitectura: Cliente (HTML/CSS/JS) -> Azure App Service (Node.js + Express) -> MongoDB Atlas
 */
require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const { connectDB } = require('./src/config/db');

const isProd = process.env.NODE_ENV === 'production' || !!process.env.WEBSITE_SITE_NAME; // WEBSITE_SITE_NAME existe en Azure
const app = express();

// Azure App Service está detrás de un proxy (balanceador). Necesario para IPs reales y cookies seguras.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ---------- Seguridad ----------
// Forzar HTTPS en producción
app.use((req, res, next) => {
  if (isProd && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Cabeceras de seguridad (CSP, HSTS, X-Frame-Options, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Límite general de peticiones a la API (anti abuso)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones, intenta más tarde.' },
  })
);

// ---------- Estado de salud (para Azure Health Check) ----------
app.get('/api/health', (req, res) => {
  const states = ['desconectado', 'conectado', 'conectando', 'desconectando'];
  res.json({
    status: 'ok',
    app: 'Under Caps',
    database: states[mongoose.connection.readyState] || 'desconocido',
    entorno: isProd ? 'produccion (Azure)' : 'desarrollo (local)',
    hora: new Date().toISOString(),
  });
});

// Si la base de datos no está disponible, la API responde 503 en lugar de fallar
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'La base de datos no está disponible. Revisa MONGODB_URI.' });
  }
  next();
});

// ---------- Rutas de la API ----------
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/newsletter', require('./src/routes/newsletter'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ---------- Frontend estático ----------
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: isProd ? '1h' : 0 }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// Manejador de errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------- Arranque ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Under Caps escuchando en el puerto ${PORT} (${isProd ? 'producción' : 'desarrollo'})`);
  connectDB();
});
