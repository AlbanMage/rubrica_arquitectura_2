/* Panel de administración */
(async () => {
  const { api, money, esc, $, $$, fmtDate, toast, getUser, logout } = UC;
  const user = await getUser();

  if (!user) {
    location.href = '/login.html?next=/admin.html';
    return;
  }
  if (user.role !== 'admin') {
    $('#admin-denied').innerHTML = `<div class="empty" style="margin-top:24px"><h3>Acceso restringido</h3><p>Esta sección es solo para administradores. El intento quedó registrado.</p><p style="margin-top:16px"><a class="btn" href="/">Volver al inicio</a></p></div>`;
    api('/admin/stats').catch(() => {}); // genera el evento ACCESO_DENEGADO en el log
    return;
  }

  $('#admin-root').hidden = false;
  const view = $('#view');
  let products = [];

  const views = {
    async dashboard() {
      const s = await api('/admin/stats');
      const { status, database, entorno } = await fetch('/api/health').then((r) => r.json());
      view.innerHTML = `
        <div class="admin-head"><h2>Resumen</h2></div>
        <div class="kpis">
          <div class="kpi"><span>Ventas totales</span><strong>${money(s.revenue)}</strong></div>
          <div class="kpi"><span>Pedidos</span><strong>${s.orders}</strong></div>
          <div class="kpi"><span>Usuarios registrados</span><strong>${s.users}</strong></div>
          <div class="kpi"><span>Productos</span><strong>${s.products}</strong></div>
          <div class="kpi"><span>Suscriptores newsletter</span><strong>${s.subscribers}</strong></div>
          <div class="kpi"><span>Logins fallidos (24h)</span><strong style="color:${s.failedLogins24h ? 'var(--danger)' : 'inherit'}">${s.failedLogins24h}</strong></div>
          <div class="kpi" style="grid-column:span 2"><span>Inventario bajo (≤ 5)</span><strong style="font-size:15px;margin-top:8px">${
            s.lowStock.length ? s.lowStock.map((p) => `${esc(p.name)} (${p.stock})`).join(' · ') : 'Todo en orden ✓'
          }</strong></div>
        </div>
        <div class="admin-head"><h2>Arquitectura en la nube</h2></div>
        <div class="arch">
          <div class="kpi"><span>Frontend + Backend</span><strong>Azure App Service</strong><span>Node.js + Express · ${esc(entorno)}</span></div>
          <div class="kpi"><span>Base de datos</span><strong>MongoDB Atlas</strong><span><i class="status-dot ${database === 'conectado' ? 'on' : 'off'}"></i>${esc(database)} · ${esc(s.database.name || '')}</span></div>
          <div class="kpi"><span>Seguridad</span><strong>HTTPS · JWT · bcrypt</strong><span>Helmet, rate limit, bloqueo de cuenta</span></div>
        </div>
        <p style="color:var(--muted);font-size:12.5px;margin-top:12px">Estado del API: ${esc(status)} · Host BD: ${esc(s.database.host || '')}</p>`;
    },

    async products() {
      ({ products } = await api('/admin/products'));
      view.innerHTML = `
        <div class="admin-head"><h2>Productos (${products.length})</h2><button class="btn btn-sm" id="new-product">+ Nuevo producto</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Vendidos</th><th>Estado</th><th></th></tr></thead>
          <tbody>${products
            .map(
              (p) => `<tr>
              <td><img src="${esc(p.image)}" alt=""></td>
              <td><strong>${esc(p.name)}</strong><br><span style="color:var(--muted);font-size:12px">${esc(p.color)}</span></td>
              <td>${esc(p.category)}</td>
              <td>${money(p.price)}</td>
              <td style="color:${p.stock <= 5 ? 'var(--danger)' : 'inherit'};font-weight:700">${p.stock}</td>
              <td>${p.sold}</td>
              <td>${p.active ? '<span class="pill entregado">Visible</span>' : '<span class="pill cancelado">Oculto</span>'}</td>
              <td style="white-space:nowrap"><button class="btn btn-sm btn-outline" data-edit="${p._id}">Editar</button> <button class="btn btn-sm btn-danger" data-del="${p._id}">Eliminar</button></td>
            </tr>`
            )
            .join('')}</tbody>
        </table></div>`;
      $('#new-product').addEventListener('click', () => openModal());
    },

    async orders() {
      const { orders } = await api('/admin/orders');
      view.innerHTML = `
        <div class="admin-head"><h2>Pedidos (${orders.length})</h2></div>
        ${
          orders.length
            ? `<div class="table-wrap"><table>
          <thead><tr><th>Código</th><th>Cliente</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Pago</th><th>Estado</th></tr></thead>
          <tbody>${orders
            .map(
              (o) => `<tr>
              <td><strong>${esc(o.code)}</strong></td>
              <td>${esc(o.user?.name || '—')}<br><span style="color:var(--muted);font-size:12px">${esc(o.shippingAddress?.city || '')}</span></td>
              <td style="white-space:nowrap">${fmtDate(o.createdAt)}</td>
              <td>${o.items.map((i) => `${i.qty}× ${esc(i.name)}`).join('<br>')}</td>
              <td><strong>${money(o.total)}</strong></td>
              <td style="white-space:nowrap">${esc(o.payment?.brand || '')} •••• ${esc(o.payment?.last4 || '')}<br><span style="color:var(--muted);font-size:11px">${esc(o.payment?.transactionId || '')}</span></td>
              <td><select data-order="${o._id}">${['pagado', 'enviado', 'entregado', 'cancelado']
                .map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`)
                .join('')}</select></td>
            </tr>`
            )
            .join('')}</tbody></table></div>`
            : '<div class="empty"><h3>Aún no hay pedidos</h3><p>Realiza una compra de prueba desde la tienda.</p></div>'
        }`;
    },

    async users() {
      const { users } = await api('/admin/users');
      view.innerHTML = `
        <div class="admin-head"><h2>Usuarios (${users.length})</h2></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Registro</th><th>Último acceso</th><th>Estado</th></tr></thead>
          <tbody>${users
            .map(
              (u) => `<tr>
              <td><strong>${esc(u.name)}</strong></td>
              <td>${esc(u.email)}</td>
              <td>${u.role === 'admin' ? '<span class="pill pagado">admin</span>' : 'cliente'}</td>
              <td style="white-space:nowrap">${fmtDate(u.createdAt)}</td>
              <td style="white-space:nowrap">${u.lastLogin ? fmtDate(u.lastLogin) : '—'}</td>
              <td>${u.lockUntil && new Date(u.lockUntil) > new Date() ? '<span class="pill cancelado">Bloqueado</span>' : '<span class="pill entregado">Activo</span>'}</td>
            </tr>`
            )
            .join('')}</tbody></table></div>
        <p style="color:var(--muted);font-size:12.5px;margin-top:12px">Las contraseñas se almacenan cifradas con bcrypt y nunca se muestran.</p>`;
    },

    async security() {
      const { logs } = await api('/admin/security-logs');
      view.innerHTML = `
        <div class="admin-head"><h2>Registro de seguridad</h2><button class="btn btn-sm btn-outline" id="reload-logs">Actualizar</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Fecha</th><th>Evento</th><th>Usuario</th><th>IP</th><th>Detalle</th><th>Navegador</th></tr></thead>
          <tbody>${
            logs.length
              ? logs
                  .map(
                    (l) => `<tr>
              <td style="white-space:nowrap">${fmtDate(l.createdAt)}</td>
              <td><span class="event ${esc(l.event)}">${esc(l.event)}</span></td>
              <td>${esc(l.email || '—')}</td>
              <td>${esc(l.ip || '')}</td>
              <td>${esc(l.detail || '')}</td>
              <td style="color:var(--muted);font-size:12px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(l.userAgent)}">${esc(l.userAgent || '')}</td>
            </tr>`
                  )
                  .join('')
              : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sin eventos</td></tr>'
          }</tbody></table></div>`;
      $('#reload-logs').addEventListener('click', () => show('security'));
    },
  };

  async function show(name) {
    $$('#admin-nav [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    view.innerHTML = '<div class="skeleton" style="height:300px"></div>';
    try {
      await views[name]();
    } catch (err) {
      view.innerHTML = `<div class="empty"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  $('#admin-nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) show(b.dataset.view);
  });
  $('#admin-logout').addEventListener('click', logout);

  // ---------- Acciones de productos y pedidos ----------
  view.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) openModal(products.find((p) => p._id === edit.dataset.edit));
    if (del) {
      const p = products.find((x) => x._id === del.dataset.del);
      if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
      try {
        await api('/admin/products/' + p._id, { method: 'DELETE' });
        toast('Producto eliminado');
        show('products');
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    }
  });

  view.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-order]');
    if (!sel) return;
    try {
      await api('/admin/orders/' + sel.dataset.order, { method: 'PATCH', body: { status: sel.value } });
      toast(`Pedido actualizado a "${sel.value}"`);
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  });

  // ---------- Modal de producto ----------
  const modal = $('#product-modal');
  const form = $('#product-form');
  let editingId = null;

  function openModal(p) {
    editingId = p ? p._id : null;
    $('#modal-title').textContent = p ? `Editar: ${p.name}` : 'Nuevo producto';
    $('#product-msg').className = 'form-msg';
    form.reset();
    if (p) {
      ['name', 'category', 'price', 'comparePrice', 'stock', 'color', 'badge', 'image', 'description'].forEach((k) => {
        form[k].value = p[k] ?? '';
      });
      form.sizes.value = (p.sizes || []).join(', ');
      form.featured.checked = !!p.featured;
      form.active.checked = p.active !== false;
    }
    modal.classList.add('open');
  }
  const closeModal = () => modal.classList.remove('open');
  $('#modal-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => e.target === modal && closeModal());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: form.name.value,
      category: form.category.value,
      price: form.price.value,
      comparePrice: form.comparePrice.value,
      stock: form.stock.value,
      color: form.color.value,
      sizes: form.sizes.value,
      badge: form.badge.value,
      image: form.image.value,
      description: form.description.value,
      featured: form.featured.checked,
      active: form.active.checked,
    };
    try {
      await api('/admin/products' + (editingId ? '/' + editingId : ''), { method: editingId ? 'PUT' : 'POST', body });
      closeModal();
      toast(editingId ? 'Producto actualizado' : 'Producto creado');
      show('products');
    } catch (err) {
      const msg = $('#product-msg');
      msg.className = 'form-msg error';
      msg.textContent = err.message;
    }
  });

  show('dashboard');
})();
