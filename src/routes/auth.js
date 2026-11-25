const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { setSession, clearSession, loadUser, logEvent } = require('../middleware/auth');

const router = express.Router();

// Máximo 20 intentos de login/registro cada 15 minutos por IP (anti fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (name.length < 2) return res.status(400).json({ error: 'Escribe tu nombre completo' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Correo electrónico inválido' });
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres, con letras y números' });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const user = new User({ name, email });
    await user.setPassword(password);
    await user.save();
    await logEvent(req, 'REGISTRO', { email, user: user._id });

    setSession(res, user);
    res.status(201).json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

    const user = await User.findOne({ email });
    if (!user) {
      await logEvent(req, 'LOGIN_FALLIDO', { email, detail: 'Usuario no existe' });
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    if (user.isLocked()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      await logEvent(req, 'LOGIN_FALLIDO', { email, user: user._id, detail: 'Cuenta bloqueada' });
      return res.status(423).json({ error: `Cuenta bloqueada temporalmente. Intenta en ${mins} min.` });
    }

    const ok = await user.checkPassword(password);
    if (!ok) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        user.failedAttempts = 0;
        await user.save();
        await logEvent(req, 'CUENTA_BLOQUEADA', { email, user: user._id, detail: `${MAX_FAILED} intentos fallidos` });
        return res.status(423).json({ error: `Demasiados intentos fallidos. Cuenta bloqueada ${LOCK_MINUTES} minutos.` });
      }
      await user.save();
      await logEvent(req, 'LOGIN_FALLIDO', { email, user: user._id, detail: `Contraseña incorrecta (${user.failedAttempts}/${MAX_FAILED})` });
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    user.failedAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();
    await logEvent(req, 'LOGIN_OK', { email, user: user._id });

    setSession(res, user);
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', loadUser, async (req, res) => {
  if (req.user) await logEvent(req, 'LOGOUT', { email: req.user.email, user: req.user._id });
  clearSession(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', loadUser, (req, res) => {
  res.json({ user: req.user ? req.user.toPublic() : null });
});

module.exports = router;
