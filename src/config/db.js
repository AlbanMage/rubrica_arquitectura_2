const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const seedProducts = require('../seed/products');

mongoose.set('strictQuery', true);

/** Crea los productos de ejemplo si la colección está vacía */
async function seedIfEmpty() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(seedProducts);
    console.log(`[DB] Catálogo inicial cargado: ${seedProducts.length} productos`);
  }
}

/** Crea (o actualiza el rol de) la cuenta administradora definida en las variables de entorno */
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@undercaps.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('Falta la variable de entorno ADMIN_PASSWORD.');
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = new User({ name: 'Administrador', email, role: 'admin' });
    await admin.setPassword(password);
    await admin.save();
    console.log(`[DB] Usuario administrador creado: ${email}`);
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] Falta la variable de entorno MONGODB_URI. La tienda cargará pero la API responderá 503.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log(`[DB] Conectado a MongoDB (${mongoose.connection.host} / ${mongoose.connection.name})`);
    await seedIfEmpty();
    await ensureAdmin();
  } catch (err) {
    console.error('[DB] Error conectando a MongoDB:', err.message);
    console.error('[DB] Reintentando en 15 segundos...');
    setTimeout(connectDB, 15000);
  }
}

module.exports = { connectDB };
