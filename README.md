# Under Caps — Tienda en línea de gorras

Proyecto final de **Arquitectura en la Nube**: tienda en línea funcional desplegada en **Microsoft Azure App Service (Linux + Node.js)** con persistencia de datos en **MongoDB Atlas** y controles de seguridad.

## Arquitectura en la nube

```text
Usuario (Navegador HTTPS)
        │
        ▼
Microsoft Azure App Service (Linux · Node.js 22 LTS · Express)
  ├── Frontend estático (public/: HTML, CSS, JS, imágenes)
  ├── API REST (/api/products, /api/auth, /api/orders, /api/admin, /api/health)
  └── Seguridad (HTTPS, Helmet/CSP, bcrypt, JWT httpOnly, Rate Limit, Auditoría)
        │
        ▼  (TLS / SRV)
MongoDB Atlas (Base de datos en la nube)
  ├── products      (catálogo e inventario)
  ├── users         (clientes y admin con contraseñas cifradas)
  ├── orders        (pedidos y comprobantes de pago)
  ├── securitylogs  (registro de seguridad / auditoría)
  └── subscribers   (newsletter)
```

## Requisitos de la rúbrica cubiertos

1. **Accesible por internet**: URL pública HTTPS (`https://<tu-app>.azurewebsites.net`).
2. **Cargado en una plataforma en línea**: Microsoft Azure App Service (Linux, plan Free F1).
3. **Registro de seguridad**:
   - Contraseñas cifradas con `bcryptjs` (12 rondas).
   - Sesiones con JWT en cookie `httpOnly` + `Secure` + `SameSite=Lax`.
   - Cabeceras de seguridad (`helmet` + CSP) y redirección forzada a HTTPS.
   - Protección contra fuerza bruta (`express-rate-limit`) y bloqueo temporal de cuenta tras 5 intentos fallidos.
   - Colección `securitylogs` visible en el **Panel de Administración -> Seguridad** (registra `REGISTRO`, `LOGIN_OK`, `LOGIN_FALLIDO`, `CUENTA_BLOQUEADA`, `LOGOUT`, `ACCESO_DENEGADO` con IP, fecha y navegador).
4. **Mantiene la información (Base de datos)**: MongoDB Atlas almacena productos, inventario (se descuenta al comprar y se restaura al cancelar), usuarios, pedidos, suscriptores y logs. Al conectar por primera vez, carga automáticamente 12 gorras y el usuario administrador.
5. **Funcional**: catálogo con filtros/búsqueda, detalle de producto, carrito, checkout con pasarela de pruebas, historial de pedidos del cliente y panel CRUD de administración.

## Probar en local

1. Copia `.env.example` como `.env` y coloca tu `MONGODB_URI` de MongoDB Atlas.
2. Instala dependencias y arranca el servidor:
   ```bash
   npm install
   npm start
   ```
3. Abre `http://localhost:3000`.

## Configuración de administrador y pruebas para la sustentación

- **Administrador** (creado automáticamente al iniciar): configura `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el entorno. Usa una contraseña única y segura; no publiques valores reales ni compartas el archivo `.env`.
- **Tarjetas de prueba (sandbox)** en el carrito:
  - Aprobada: `4242 4242 4242 4242` (cualquier fecha futura y CVV de 3 dígitos)
  - Rechazada: `4000 0000 0000 0002`
- **Estado del servicio y base de datos**: `/api/health`
