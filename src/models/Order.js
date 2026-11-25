const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    image: String,
    size: String,
    price: Number,
    qty: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true }, // ej: UC-24A9F1
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    subtotal: Number,
    shipping: Number,
    total: Number,
    shippingAddress: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
    },
    // Solo se guarda información NO sensible del pago (nunca el número completo ni el CVV)
    payment: {
      method: { type: String, default: 'tarjeta' },
      brand: String,
      last4: String,
      transactionId: String,
      status: { type: String, default: 'aprobado' },
    },
    status: {
      type: String,
      enum: ['pagado', 'enviado', 'entregado', 'cancelado'],
      default: 'pagado',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
