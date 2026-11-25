/* Carrito + Checkout (envío y pago) */
(async () => {
  const { api, money, esc, $, icon, cart, getUser, toast, FREE_SHIPPING_FROM } = UC;
  const root = $('#cart-root');
  const user = await getUser();

  function render() {
    const items = cart.get();
    if (!items.length) {
      root.innerHTML = `
        <div class="empty" style="margin-top:24px">
          <h3>Tu carrito está vacío</h3>
          <p>Descubre nuestra colección y encuentra tu próxima gorra favorita.</p>
          <p style="margin-top:20px"><a href="/tienda.html" class="btn">Ir a la tienda</a></p>
        </div>`;
      return;
    }

    const { subtotal, shipping, total } = cart.totals();
    const missing = Math.max(0, FREE_SHIPPING_FROM - subtotal);
    const pct = Math.min(100, (subtotal / FREE_SHIPPING_FROM) * 100);

    root.innerHTML = `
      <div class="checkout">
        <div>
          <div class="panel">
            <h2><span class="step">1</span> Productos (${cart.count()})</h2>
            <div id="items">
              ${items
                .map(
                  (i, idx) => `
                <div class="cart-item">
                  <a href="/producto.html?slug=${encodeURIComponent(i.slug)}"><img src="${esc(i.image)}" alt="${esc(i.name)}"></a>
                  <div>
                    <h4>${esc(i.name)}</h4>
                    <div class="meta">${esc(i.category || '')} · Talla ${esc(i.size)} · ${money(i.price)} c/u</div>
                    <div class="qty">
                      <button data-dec="${idx}" aria-label="Menos">−</button>
                      <input value="${i.qty}" readonly aria-label="Cantidad">
                      <button data-inc="${idx}" aria-label="Más">+</button>
                    </div>
                  </div>
                  <div style="text-align:right">
                    <strong>${money(i.price * i.qty)}</strong><br>
                    <button class="remove" data-remove="${idx}">Eliminar</button>
                  </div>
                </div>`
                )
                .join('')}
            </div>
          </div>

          ${
            user
              ? `
          <form id="checkout-form" autocomplete="on">
            <div class="panel">
              <h2><span class="step">2</span> Datos de envío</h2>
              <div class="row-2">
                <div class="field"><label for="fullName">Nombre completo</label><input class="input" id="fullName" name="fullName" required value="${esc(user.name)}"></div>
                <div class="field"><label for="phone">Teléfono</label><input class="input" id="phone" name="phone" required inputmode="tel" placeholder="300 123 4567"></div>
              </div>
              <div class="row-2">
                <div class="field"><label for="address">Dirección</label><input class="input" id="address" name="address" required placeholder="Calle 00 # 00-00, Apto"></div>
                <div class="field"><label for="city">Ciudad</label><input class="input" id="city" name="city" required placeholder="Bogotá"></div>
              </div>
            </div>
            <div class="panel">
              <h2><span class="step">3</span> Pago con tarjeta</h2>
              <div class="test-cards">
                <strong>Modo de pruebas (sandbox):</strong> no se realizan cobros reales.<br>
                Aprobada: <code>4242 4242 4242 4242</code> · Rechazada: <code>4000 0000 0000 0002</code> · Fecha futura y CVV cualquiera.
              </div>
              <div class="field"><label for="cardName">Nombre del titular</label><input class="input" id="cardName" name="cardName" required autocomplete="cc-name"></div>
              <div class="row-3">
                <div class="field"><label for="cardNumber">Número de tarjeta</label><input class="input" id="cardNumber" name="cardNumber" required inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="23"></div>
                <div class="field"><label for="cardExp">Vence</label><input class="input" id="cardExp" name="cardExp" required placeholder="MM/AA" maxlength="5" autocomplete="cc-exp"></div>
                <div class="field"><label for="cardCvc">CVV</label><input class="input" id="cardCvc" name="cardCvc" required inputmode="numeric" maxlength="4" placeholder="123" autocomplete="cc-csc"></div>
              </div>
              <small style="color:var(--muted);font-size:12px">${icon.lock.replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-1px"')} Los datos de la tarjeta no se almacenan: solo se guardan la franquicia y los últimos 4 dígitos.</small>
            </div>
          </form>`
              : `
          <div class="panel" style="text-align:center">
            <h2 style="justify-content:center"><span class="step">2</span> Inicia sesión para pagar</h2>
            <p style="color:var(--muted);margin-top:-8px">Necesitas una cuenta para finalizar tu compra y ver el estado de tus pedidos.</p>
            <a href="/login.html?next=/carrito.html" class="btn">Iniciar sesión o registrarme</a>
          </div>`
          }
        </div>

        <aside class="panel summary">
          <h2>Resumen del pedido</h2>
          <div class="ship-progress">
            ${missing > 0 ? `Te faltan <strong>${money(missing)}</strong> para envío gratis` : `<strong>¡Tienes envío gratis!</strong>`}
            <div class="bar"><i style="width:${pct}%"></i></div>
          </div>
          <div class="sum-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
          <div class="sum-row"><span>Envío</span><span>${shipping ? money(shipping) : 'Gratis'}</span></div>
          <div class="sum-row total"><span>Total</span><span>${money(total)}</span></div>
          <div id="pay-msg" class="form-msg"></div>
          ${
            user
              ? `<button class="btn btn-block" id="pay-btn" form="checkout-form" type="submit" style="margin-top:12px">${icon.lock} Pagar ${money(total)}</button>`
              : `<a class="btn btn-block" style="margin-top:12px" href="/login.html?next=/carrito.html">Continuar</a>`
          }
          <div class="secure-note">${icon.shield} Pago seguro · Conexión HTTPS cifrada</div>
        </aside>
      </div>`;

    bind();
  }

  function bind() {
    $('#items').addEventListener('click', (e) => {
      const t = e.target;
      const items = cart.get();
      if (t.dataset.inc) cart.setQty(+t.dataset.inc, items[+t.dataset.inc].qty + 1);
      else if (t.dataset.dec) cart.setQty(+t.dataset.dec, items[+t.dataset.dec].qty - 1);
      else if (t.dataset.remove) cart.remove(+t.dataset.remove);
      else return;
      render();
    });

    const form = $('#checkout-form');
    if (!form) return;

    // Formato automático de tarjeta y fecha
    form.cardNumber.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
    });
    form.cardExp.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
      e.target.value = v;
    });
    form.cardCvc.addEventListener('input', (e) => (e.target.value = e.target.value.replace(/\D/g, '')));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#pay-btn');
      const msg = $('#pay-msg');
      msg.className = 'form-msg';
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.textContent = 'Procesando pago…';

      try {
        const { order } = await api('/orders', {
          method: 'POST',
          body: {
            items: cart.get().map((i) => ({ productId: i.id, qty: i.qty, size: i.size })),
            shipping: {
              fullName: form.fullName.value,
              phone: form.phone.value,
              address: form.address.value,
              city: form.city.value,
            },
            card: {
              name: form.cardName.value,
              number: form.cardNumber.value,
              exp: form.cardExp.value,
              cvc: form.cardCvc.value,
            },
          },
        });
        cart.clear();
        location.href = '/cuenta.html?pedido=' + encodeURIComponent(order.code);
      } catch (err) {
        msg.className = 'form-msg error';
        msg.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = original;
        if (err.status === 401) toast('Tu sesión expiró, inicia sesión de nuevo', { type: 'error' });
      }
    });
  }

  render();
})();
