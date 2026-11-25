const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['cliente', 'admin'], default: 'cliente' },
    lastLogin: Date,
    failedAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true }
);

/** Las contraseñas NUNCA se guardan en texto plano: se cifran con bcrypt (12 rondas) */
userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.toPublic = function () {
  return { id: this._id, name: this.name, email: this.email, role: this.role, createdAt: this.createdAt };
};

module.exports = mongoose.model('User', userSchema);
