const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

const CATEGORIES = ['Baseball', 'Dad Hat', 'Snapback', 'Trucker', 'Fitted', 'Bucket'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/products?category=&q=&sort=&featured=&limit=
router.get('/', async (req, res, next) => {
  try {
    const filter = { active: true };
    const { category, q, sort, featured, sale } = req.query;

    if (typeof category === 'string' && CATEGORIES.includes(category)) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (sale === 'true') filter.comparePrice = { $gt: 0 };
    if (typeof q === 'string' && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim().slice(0, 50)), 'i');
      filter.$or = [{ name: rx }, { color: rx }, { category: rx }, { description: rx }];
    }

    const sorts = {
      'precio-asc': { price: 1 },
      'precio-desc': { price: -1 },
      nuevos: { createdAt: -1 },
      populares: { sold: -1 },
    };
    const sortBy = sorts[sort] || { featured: -1, sold: -1 };
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);

    const products = await Product.find(filter).sort(sortBy).limit(limit).lean();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories -> conteo por categoría
router.get('/categories', async (req, res, next) => {
  try {
    const agg = await Product.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$category', count: { $sum: 1 }, image: { $first: '$image' } } },
    ]);
    const categories = CATEGORIES.map((name) => {
      const found = agg.find((a) => a._id === name);
      return { name, count: found ? found.count : 0, image: found ? found.image : '' };
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const product = await Product.findOne({ slug, active: true }).lean();
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    const related = await Product.find({ category: product.category, _id: { $ne: product._id }, active: true })
      .limit(4)
      .lean();
    res.json({ product, related });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
