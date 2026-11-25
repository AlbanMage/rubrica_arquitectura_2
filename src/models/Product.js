const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: ['Baseball', 'Dad Hat', 'Snapback', 'Trucker', 'Fitted', 'Bucket'],
    },
    color: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0 }, // precio antes del descuento
    image: { type: String, default: '' },
    sizes: { type: [String], default: ['Única'] },
    stock: { type: Number, default: 0, min: 0 },
    sold: { type: Number, default: 0 },
    rating: { type: Number, default: 4.7, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    badge: { type: String, default: '' }, // "Nuevo", "Más vendido", etc.
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', color: 'text' });

module.exports = mongoose.model('Product', productSchema);
