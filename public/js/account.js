/* Mi cuenta: perfil + historial de pedidos */
(async () => {
  const { api, money, esc, $, params, fmtDate, icon, getUser, logout } = UC;
  const root = $('#account-root');
  const user = await getUser();

  if (!user) {
    location.href = '/login.html?next=/cuenta.html';
    return;
  }

  const newOrder = params().get('pedido');

  root.innerHTML = `
    <div class="account">
      <aside class="panel profile-card">
        <div class="avatar">${esc(user.name.charAt(0).toUpperCase())}</div>
        <h3 style="margin:0">${esc(user.name)}</h3>
        <p style="color:var(--muted);margin:4px 0 4px;font-size:14px">${esc(user.email)}</p>
        <p style="color:var(--muted);margin:0 0 20px;font-size:12.5px">Cliente desde ${new Date(user.createdAt).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
        ${user.role === 'admin' ? '<a class="btn btn-block btn-accent" href="/admin.html" style="margin-bottom:10px">Panel de administración</a>' : ''}
        <a class="btn btn-block btn-outline" href="/tienda.html" style="margin-bottom:10px">Seguir comprando</a>
        <button class="btn btn-block btn-danger" id="logout">Cerrar sesión</button>
      </aside>
      <section>
        ${
          newOrder
            ? `<div class="success-banner">${icon.checkCircle}<div><strong>¡Pago aprobado! Tu pedido ${esc(newOrder)} fue confirmado.</strong><br><span style="font-size:14px">Te enviaremos un correo cuando esté en camino.</span></div></div>`
            : ''
        }
        <h2 style="margin:0 0 16px;font-size:20px">Mis pedidos</h2>
        <div id="orders"><div class="skeleton" style="height:140px"></div></div>
      </section>
    </div>`;

  $('#logout').addEventListener('click', logout);

  try {
    const { orders } = await api('/orders/mine');
    $('#orders').innerHTML = orders.length
      ? orders
          .map(
            (o) => `
        <div class="order">
          <div class="order-head">
            <div><span>Pedido</span><strong>${esc(o.code)}</strong></div>
            <div><span>Fecha</span><strong>${fmtDate(o.createdAt)}</strong></div>
            <div><span>Total</span><strong>${money(o.total)}</strong></div>
            <div><span>Pago</span><strong>${esc(o.payment?.brand || '')} •••• ${esc(o.payment?.last4 || '')}</strong></div>
            <div><span>Estado</span><span class="pill ${esc(o.status)}">${esc(o.status)}</span></div>
          </div>
          <div class="order-items">
            ${o.items
              .map(
                (i) => `
              <div class="cart-item">
                <img src="${esc(i.image)}" alt="${esc(i.name)}">
                <div><h4>${esc(i.name)}</h4><div class="meta">Talla ${esc(i.size)} · Cantidad ${i.qty}</div></div>
                <strong>${money(i.price * i.qty)}</strong>
              </div>`
              )
              .join('')}
          </div>
        </div>`
          )
          .join('')
      : `<div class="empty"><h3>Aún no tienes pedidos</h3><p>Cuando compres, verás aquí el estado de tus pedidos.</p><p style="margin-top:16px"><a class="btn" href="/tienda.html">Explorar la tienda</a></p></div>`;
  } catch (err) {
    $('#orders').innerHTML = `<div class="empty"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
})();
