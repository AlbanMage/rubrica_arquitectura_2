const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');

let warned = false;
function getSecret() {
  if (!process.env.JWT_SECRET) {
    if (!warned) {
      console.warn('[AUTH] JWT_SECRET no definido: se usa una clave temporal (las sesiones se cerrarán al reiniciar).');
      warned = true;
    }
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  }
  return process.env.JWT_SECRET;
}

const COOKIE_NAME = 'uc_session';
const isProd = process.env.NODE_ENV === 'production' || !!process.env.WEBSITE_SITE_NAME;

/** Crea la sesión: token JWT firmado, guardado en cookie httpOnly (no accesible desde JavaScript) */
function setSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getSecret(), { expiresIn: '2h' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000,
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: 'lax' });
}

/** Carga el usuario si hay sesión válida (no obliga a estar logueado) */
async function loadUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, getSecret());
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    clearSession(res);
  }
  next();
}

/** Exige sesión iniciada */
function requireAuth(req, res, next) {
  loadUser(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
    next();
  });
}

/** Exige rol administrador */
function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    if (req.user.role !== 'admin') {
      await logEvent(req, 'ACCESO_DENEGADO', { email: req.user.email, user: req.user._id, detail: req.originalUrl });
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }
    next();
  });
}

/** Guarda un evento en el registro de seguridad */
async function logEvent(req, event, { email, user, detail } = {}) {
  try {
    await SecurityLog.create({
      event,
      email,
      user,
      detail,
      ip: req.ip,
      userAgent: (req.headers['user-agent'] || '').slice(0, 200),
    });
  } catch (err) {
    console.error('[SECURITY LOG]', err.message);
  }
}

module.exports = { setSession, clearSession, loadUser, requireAuth, requireAdmin, logEvent };
