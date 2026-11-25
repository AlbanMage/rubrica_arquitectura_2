const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const FREE_SHIPPING_FROM = 200000;
const SHIPPING_COST = 12000;

const str = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Algoritmo de Luhn: valida que el número de tarjeta tenga formato real */
function luhn(num) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function cardBrand(num) {
  if (/^4/.test(num)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
  if (/^3[47]/.test(num)) return 'American Express';
  return 'Tarjeta';
}

/**
 * Pasarela de pago SIMULADA (modo pruebas, similar al "sandbox" de Stripe/Wompi).
 * - Tarjeta aprobada de prueba: 4242 4242 4242 4242
 * - Tarjeta rechazada de prueba: 4000 0000 0000 0002
 */
function processPayment(card) {
  const number = str(card?.number, 30).replace(/[\s-]/g, '');
  const exp = str(card?.exp, 7);
  const cvc = str(card?.cvc, 4);
  const holder = str(card?.name, 80);

  if (!/^\d{13,19}$/.test(number) || !luhn(number)) return { ok: false, error: 'Número de tarjeta inválido' };
  if (holder.length < 3) return { ok: false, error: 'Escribe el nombre del titular' };
  const m = exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return { ok: false, error: 'Fecha de vencimiento inválida (MM/AA)' };
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  const expDate = new Date(year, month, 0, 23, 59, 59);
  if (month < 1 || month > 12 || expDate < new Date()) return { ok: false, error: 'La tarjeta está vencida' };
  if (!/^\d{3,4}$/.test(cvc)) return { ok: false, error: 'CVV inválido' };
  if (number.endsWith('0002')) return { ok: false, error: 'Pago rechazado por el banco (fondos insuficientes)' };

  return {
    ok: true,
    payment: {
      method: 'tarjeta',
      brand: cardBrand(number),
      last4: number.slice(-4),
      transactionId: 'TX-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      status: 'aprobado',
    },
  };
}

// POST /api/orders  -> crear pedido (checkout)
router.post('/', requireAuth, async (req, res, next) => {
  const decremented = [];
  try {
    const { items, shipping, card } = req.body || {};
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const address = {
      fullName: str(shipping?.fullName, 80),
      phone: str(shipping?.phone, 20),
      address: str(shipping?.address, 150),
      city: str(shipping?.city, 60),
    };
    if (!address.fullName || !address.phone || !address.address || !address.city) {
      return res.status(400).json({ error: 'Completa todos los datos de envío' });
    }

    // Los precios SIEMPRE se toman de la base de datos (nunca del navegador)
    const orderItems = [];
    for (const it of items) {
      const qty = parseInt(it?.qty, 10);
      if (!mongoose.isValidObjectId(it?.productId) || !Number.isInteger(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({ error: 'Producto o cantidad inválida' });
      }
      const product = await Product.findOne({ _id: it.productId, active: true });
      if (!product) return res.status(400).json({ error: 'Un producto del carrito ya no está disponible' });
      const size = product.sizes.includes(it.size) ? it.size : product.sizes[0];
      orderItems.push({ product, qty, size });
    }

    const subtotal = orderItems.reduce((s, i) => s + i.product.price * i.qty, 0);
    const shippingCost = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
    const total = subtotal + shippingCost;

    // Procesar el pago (simulado)
    const pay = processPayment(card);
    if (!pay.ok) return res.status(402).json({ error: pay.error });

    // Descontar inventario de forma atómica (evita vender más de lo que hay)
    for (const i of orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: i.product._id, stock: { $gte: i.qty } },
        { $inc: { stock: -i.qty, sold: i.qty } }
      );
      if (!updated) {
        throw Object.assign(new Error('stock'), { userMessage: `No hay suficiente inventario de "${i.product.name}"` });
      }
      decremented.push(i);
    }

    const order = await Order.create({
      code: 'UC-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      user: req.user._id,
      items: orderItems.map((i) => ({
        product: i.product._id,
        name: i.product.name,
        image: i.product.image,
        size: i.size,
        price: i.product.price,
        qty: i.qty,
      })),
      subtotal,
      shipping: shippingCost,
      total,
      shippingAddress: address,
      payment: pay.payment,
    });

    res.status(201).json({ order });
  } catch (err) {
    // Revertir inventario si algo falló a mitad del proceso
    for (const i of decremented) {
      await Product.updateOne({ _id: i.product._id }, { $inc: { stock: i.qty, sold: -i.qty } });
    }
    if (err.userMessage) return res.status(409).json({ error: err.userMessage });
    next(err);
  }
});

// GET /api/orders/mine -> historial de pedidos del usuario
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
