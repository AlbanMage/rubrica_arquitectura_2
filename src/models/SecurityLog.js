const mongoose = require('mongoose');

/**
 * Registro de seguridad (auditoría): guarda cada evento de autenticación
 * con IP, navegador y fecha. Visible en el panel de administración.
 */
const securityLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      enum: ['REGISTRO', 'LOGIN_OK', 'LOGIN_FALLIDO', 'CUENTA_BLOQUEADA', 'LOGOUT', 'ACCESO_DENEGADO'],
      required: true,
    },
    email: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: String,
    userAgent: String,
    detail: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('SecurityLog', securityLogSchema);
