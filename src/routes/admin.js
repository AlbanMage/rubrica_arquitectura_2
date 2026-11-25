const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const Subscriber = require('../models/Subscriber');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin); // TODAS las rutas de este archivo exigen rol administrador

const CATEGORIES = ['Baseball', 'Dad Hat', 'Snapback', 'Trucker', 'Fitted', 'Bucket'];
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function productFromBody(body) {
  const data = {
    name: str(body.name, 100),
    description: str(body.description, 2000),
    category: CATEGORIES.includes(body.category) ? body.category : undefined,
    color: str(body.color, 40),
    price: Number(body.price),
    stock: parseInt(body.stock, 10),
    image: str(body.image, 300),
    badge: str(body.badge, 30),
    featured: body.featured === true || body.featured === 'true',
    active: body.active !== false && body.active !== 'false',
  };
  const cp = Number(body.comparePrice);
  data.comparePrice = cp > 0 ? cp : undefined;
  const sizes = str(body.sizes, 100)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  data.sizes = sizes.length ? sizes : ['Única'];
  return data;
}

function validateProduct(d) {
  if (d.name.length < 2) return 'El nombre es obligatorio';
  if (!d.category) return 'Selecciona una categoría válida';
  if (!Number.isFinite(d.price) || d.price < 0) return 'Precio inválido';
  if (!Number.isInteger(d.stock) || d.stock < 0) return 'Inventario inválido';
  return null;
}

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [users, products, orders, subscribers, revenueAgg, lowStock, failedLogins] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Subscriber.countDocuments(),
      Order.aggregate([{ $match: { status: { $ne: 'cancelado' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Product.find({ stock: { $lte: 5 } }).select('name stock').lean(),
      SecurityLog.countDocuments({
        event: { $in: ['LOGIN_FALLIDO', 'CUENTA_BLOQUEADA'] },
        createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
      }),
    ]);
    res.json({
      users,
      products,
      orders,
      subscribers,
      revenue: revenueAgg[0]?.total || 0,
      lowStock,
      failedLogins24h: failedLogins,
      database: { host: mongoose.connection.host, name: mongoose.connection.name },
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Productos (CRUD) ----------
router.get('/products', async (req, res, next) => {
  try {
    res.json({ products: await Product.find().sort({ createdAt: -1 }).lean() });
  } catch (err) {
    next(err);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const data = productFromBody(req.body || {});
    const error = validateProduct(data);
    if (error) return res.status(400).json({ error });
    let slug = slugify(data.name) || 'producto';
    if (await Product.exists({ slug })) slug += '-' + Date.now().toString(36);
    const product = await Product.create({ ...data, slug, rating: 5, reviews: 0 });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const data = productFromBody(req.body || {});
    const error = validateProduct(data);
    if (error) return res.status(400).json({ error });
    const update = { $set: { ...data } };
    if (data.comparePrice === undefined) {
      delete update.$set.comparePrice;
      update.$unset = { comparePrice: 1 };
    }
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Pedidos ----------
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200).populate('user', 'name email').lean();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['pagado', 'enviado', 'entregado', 'cancelado'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Si se cancela, se devuelve el inventario
    if (status === 'cancelado' && order.status !== 'cancelado') {
      for (const it of order.items) {
        await Product.updateOne({ _id: it.product }, { $inc: { stock: it.qty, sold: -it.qty } });
      }
    }
    order.status = status;
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// ---------- Usuarios y seguridad ----------
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.get('/security-logs', async (req, res, next) => {
  try {
    const logs = await SecurityLog.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
