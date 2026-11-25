/* Página de detalle de producto */
(async () => {
  const { api, money, esc, $, params, icon, cart, productCard, bindAddButtons } = UC;
  const root = $('#product-root');
  const slug = params().get('slug');

  if (!slug) {
    location.href = '/tienda.html';
    return;
  }

  try {
    const { product: p, related } = await api('/products/' + encodeURIComponent(slug));
    document.title = `${p.name} | Under Caps`;
    $('#crumb').innerHTML += ` / <a href="/tienda.html?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a> / <span>${esc(p.name)}</span>`;

    const sale = p.comparePrice && p.comparePrice > p.price;
    let size = p.sizes[0];
    let qty = 1;

    root.innerHTML = `
      <div class="product">
        <div class="product-media"><img src="${esc(p.image)}" alt="${esc(p.name)}"></div>
        <div class="product-info">
          <span class="eyebrow">${esc(p.category)}${p.badge ? ' · ' + esc(p.badge) : ''}</span>
          <h1>${esc(p.name)}</h1>
          <div style="display:flex;gap:16px;align-items:center">
            <span class="price">${money(p.price)}${sale ? `<s>${money(p.comparePrice)}</s>` : ''}</span>
            <span class="rating">${icon.star} ${p.rating} · ${p.reviews} reseñas</span>
          </div>
          <p class="desc">${esc(p.description)}</p>
          <div class="option-label">Color: <span style="font-weight:500">${esc(p.color)}</span></div>
          <div class="option-label">Talla</div>
          <div class="sizes" id="sizes">
            ${p.sizes.map((s, i) => `<button class="size-btn ${i === 0 ? 'active' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>
          <div class="option-label">Cantidad</div>
          <div class="qty">
            <button id="minus" aria-label="Menos">−</button>
            <input id="qty" value="1" inputmode="numeric" aria-label="Cantidad">
            <button id="plus" aria-label="Más">+</button>
          </div>
          ${
            p.stock > 0
              ? `<div class="stock-note ${p.stock <= 5 ? 'low' : ''}">${p.stock <= 5 ? `¡Solo quedan ${p.stock} unidades!` : `En stock · ${p.stock} disponibles`}</div>`
              : '<div class="stock-note low">Producto agotado</div>'
          }
          <div class="buy-row">
            <button class="btn" id="add" ${p.stock > 0 ? '' : 'disabled'}>${icon.bag} Agregar al carrito</button>
            <button class="btn btn-outline" id="buy" ${p.stock > 0 ? '' : 'disabled'}>Comprar ahora</button>
          </div>
          <div class="perks">
            <div class="perk">${icon.truck} Envío gratis desde ${money(UC.FREE_SHIPPING_FROM)} · Entrega en 2 a 5 días hábiles</div>
            <div class="perk">${icon.refresh} Cambios y devoluciones gratis durante 30 días</div>
            <div class="perk">${icon.shield} Pago 100% seguro con conexión cifrada</div>
          </div>
        </div>
      </div>`;

    const qtyInput = $('#qty');
    const setQty = (n) => {
      qty = Math.max(1, Math.min(10, Math.min(p.stock || 1, n || 1)));
      qtyInput.value = qty;
    };
    $('#minus').addEventListener('click', () => setQty(qty - 1));
    $('#plus').addEventListener('click', () => setQty(qty + 1));
    qtyInput.addEventListener('change', () => setQty(parseInt(qtyInput.value, 10)));

    $('#sizes').addEventListener('click', (e) => {
      const b = e.target.closest('[data-size]');
      if (!b) return;
      size = b.dataset.size;
      document.querySelectorAll('.size-btn').forEach((x) => x.classList.toggle('active', x === b));
    });

    $('#add').addEventListener('click', () => cart.add(p, qty, size));
    $('#buy').addEventListener('click', () => {
      cart.add(p, qty, size);
      location.href = '/carrito.html';
    });

    if (related.length) {
      $('#related-section').hidden = false;
      $('#related').innerHTML = related.map(productCard).join('');
      bindAddButtons($('#related'), related);
    }
  } catch (err) {
    root.innerHTML = `<div class="empty" style="margin-top:24px"><h3>Producto no encontrado</h3><p>${esc(err.message)}</p><p><a class="btn" href="/tienda.html">Volver a la tienda</a></p></div>`;
  }
})();
