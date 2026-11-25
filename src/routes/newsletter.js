const express = require('express');
const Subscriber = require('../models/Subscriber');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/newsletter
router.post('/', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Correo inválido' });
    await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    res.json({ ok: true, message: '¡Gracias por suscribirte!' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
