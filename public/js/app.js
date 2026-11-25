/* =========================================================
   UNDER CAPS — JavaScript compartido (header, footer, carrito, API)
   ========================================================= */
const UC = (() => {
  const CART_KEY = 'uc_cart';
  const FREE_SHIPPING_FROM = 200000;
  const SHIPPING_COST = 12000;

  // ---------- Iconos SVG ----------
  const icon = {
    logo: '<svg viewBox="0 0 40 26" fill="none" aria-hidden="true"><path d="M5 20a12 12 0 0 1 24 0" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M5 20h31" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="5" r="2.2" fill="#b08d57"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.9 7.5.7-5.7 5 1.7 7.4L12 18.3 5.5 22l1.7-7.4-5.7-5 7.5-.7z"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    tt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2.3 1.7 3.8 4 4v3c-1.5 0-2.8-.4-4-1.2V15a6 6 0 1 1-6-6v3.1a3 3 0 1 0 3 2.9V3h3Z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v7h4v-7h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z"/></svg>',
  };

  // ---------- Utilidades ----------
  const money = (n) => '$' + Math.round(n || 0).toLocaleString('es-CO');
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const params = () => new URLSearchParams(location.search);
  const fmtDate = (d) =>
    new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /** Llamada a la API REST del backend */
  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    let data = {};
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (!res.ok) {
      const err = new Error(data.error || 'Error de conexión');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ---------- Toast ----------
  function toast(msg, { type = '', link } = {}) {
    let wrap = $('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `<span>${esc(msg)}</span>${link ? `<a href="${link.href}">${esc(link.text)}</a>` : ''}`;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  // ---------- Sesión ----------
  let userPromise;
  const getUser = (force = false) => {
    if (!userPromise || force) userPromise = api('/auth/me').then((d) => d.user).catch(() => null);
    return userPromise;
  };
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    location.href = '/';
  }

  // ---------- Carrito (guardado en el navegador) ----------
  const cart = {
    get() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
    },
    save(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      updateBadge();
    },
    add(p, qty = 1, size) {
      const items = cart.get();
      size = size || (p.sizes && p.sizes[0]) || 'Única';
      const found = items.find((i) => i.id === p._id && i.size === size);
      if (found) found.qty = Math.min(10, found.qty + qty);
      else items.push({ id: p._id, slug: p.slug, name: p.name, price: p.price, image: p.image, category: p.category, size, qty });
      cart.save(items);
      toast(`${p.name} agregado al carrito`, { link: { href: '/carrito.html', text: 'Ver carrito' } });
    },
    setQty(idx, qty) {
      const items = cart.get();
      if (!items[idx]) return;
      items[idx].qty = Math.max(1, Math.min(10, qty));
      cart.save(items);
    },
    remove(idx) {
      const items = cart.get();
      items.splice(idx, 1);
      cart.save(items);
    },
    clear() { cart.save([]); },
    count() { return cart.get().reduce((s, i) => s + i.qty, 0); },
    totals() {
      const subtotal = cart.get().reduce((s, i) => s + i.price * i.qty, 0);
      const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
      return { subtotal, shipping, total: subtotal + shipping };
    },
  };

  function updateBadge() {
    const el = $('#cart-count');
    if (el) {
      const n = cart.count();
      el.textContent = n;
      el.dataset.count = n;
    }
  }

  // ---------- Tarjeta de producto ----------
  function productCard(p) {
    const sale = p.comparePrice && p.comparePrice > p.price;
    return `
      <article class="card">
        <a class="card-media" href="/producto.html?slug=${encodeURIComponent(p.slug)}">
          <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
          ${p.badge ? `<span class="card-badge ${sale ? 'sale' : ''}">${esc(p.badge)}</span>` : ''}
        </a>
        ${p.stock > 0 ? `<button class="btn btn-light btn-sm card-add" data-add="${p._id}">${icon.bag} Agregar al carrito</button>` : ''}
        <div class="card-body">
          <div class="card-cat">${esc(p.category)} · ${esc(p.color)}</div>
          <a href="/producto.html?slug=${encodeURIComponent(p.slug)}" class="card-name">${esc(p.name)}</a>
          <div class="card-foot">
            <span class="price">${money(p.price)}${sale ? `<s>${money(p.comparePrice)}</s>` : ''}</span>
            ${p.stock > 0 ? `<span class="rating">${icon.star} ${p.rating} (${p.reviews})</span>` : '<span class="out">Agotado</span>'}
          </div>
        </div>
      </article>`;
  }

  /** Conecta los botones "Agregar" de una grilla con la lista de productos */
  function bindAddButtons(container, products) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      e.preventDefault();
      const p = products.find((x) => x._id === btn.dataset.add);
      if (p) cart.add(p, 1);
    });
  }

  function skeletons(n) {
    return Array.from({ length: n }, () => '<div><div class="skeleton" style="aspect-ratio:1"></div><div class="skeleton" style="height:14px;margin-top:14px;width:70%"></div></div>').join('');
  }

  // ---------- Header & Footer ----------
  function renderHeader() {
    const path = location.pathname.replace(/\.html$/, '');
    const cat = params().get('cat');
    const isActive = (href, c) => {
      if (c) return path === '/tienda' && cat === c ? 'active' : '';
      if (href === '/') return path === '/' || path === '/index' ? 'active' : '';
      return path === href && !cat && !params().get('sale') ? 'active' : '';
    };
    const header = document.getElementById('site-header');
    if (!header) return;
    header.innerHTML = `
      <div class="topbar">Envío <span>GRATIS</span> en compras desde ${money(FREE_SHIPPING_FROM)} · Devoluciones sin costo por 30 días</div>
      <header class="header">
        <div class="container">
          <button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Menú">${icon.menu}</button>
          <a href="/" class="logo" aria-label="Under Caps inicio">${icon.logo}<span class="logo-text">UNDER<b>CAPS</b></span></a>
          <nav class="nav" id="nav">
            <a href="/" class="${isActive('/')}">Inicio</a>
            <a href="/tienda.html" class="${isActive('/tienda')}">Tienda</a>
            <a href="/tienda.html?cat=Baseball" class="${isActive('', 'Baseball')}">Baseball</a>
            <a href="/tienda.html?cat=Snapback" class="${isActive('', 'Snapback')}">Snapback</a>
            <a href="/tienda.html?cat=Trucker" class="${isActive('', 'Trucker')}">Trucker</a>
            <a href="/tienda.html?cat=Bucket" class="${isActive('', 'Bucket')}">Bucket</a>
            <a href="/tienda.html?sale=true" class="sale">Ofertas</a>
          </nav>
          <div class="header-actions">
            <button class="icon-btn" id="search-toggle" aria-label="Buscar">${icon.search}</button>
            <a class="icon-btn" id="account-link" href="/login.html" aria-label="Mi cuenta">${icon.user}</a>
            <span class="user-chip" id="user-chip"></span>
            <a class="icon-btn" href="/carrito.html" aria-label="Carrito">${icon.bag}<span class="badge-count" id="cart-count"></span></a>
          </div>
        </div>
        <div class="search-bar" id="search-bar">
          <form class="container" action="/tienda.html">
            <input class="input" type="search" name="q" placeholder="Buscar gorras por nombre, color o estilo..." aria-label="Buscar">
            <button class="btn" type="submit">Buscar</button>
          </form>
        </div>
      </header>`;

    $('#menu-toggle').addEventListener('click', () => $('#nav').classList.toggle('open'));
    $('#search-toggle').addEventListener('click', () => {
      $('#search-bar').classList.toggle('open');
      $('#search-bar input').focus();
    });
    updateBadge();

    getUser().then((u) => {
      if (!u) return;
      $('#account-link').href = u.role === 'admin' ? '/admin.html' : '/cuenta.html';
      $('#user-chip').textContent = u.role === 'admin' ? 'Admin' : u.name.split(' ')[0];
    });
  }

  function renderFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    footer.innerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <a href="/" class="logo">${icon.logo}<span class="logo-text">UNDER<b>CAPS</b></span></a>
              <p style="margin-top:16px;max-width:280px">Gorras premium diseñadas para quienes cuidan cada detalle. Hechas para durar, pensadas para combinar.</p>
              <div class="socials">
                <a href="#" aria-label="Instagram">${icon.ig}</a>
                <a href="#" aria-label="TikTok">${icon.tt}</a>
                <a href="#" aria-label="Facebook">${icon.fb}</a>
              </div>
            </div>
            <div>
              <h4>TIENDA</h4>
              <ul>
                <li><a href="/tienda.html">Todas las gorras</a></li>
                <li><a href="/tienda.html?cat=Baseball">Baseball</a></li>
                <li><a href="/tienda.html?cat=Dad%20Hat">Dad Hat</a></li>
                <li><a href="/tienda.html?cat=Fitted">Fitted</a></li>
                <li><a href="/tienda.html?sale=true">Ofertas</a></li>
              </ul>
            </div>
            <div>
              <h4>AYUDA</h4>
              <ul>
                <li><a href="/cuenta.html">Mis pedidos</a></li>
                <li><a href="/#beneficios">Envíos</a></li>
                <li><a href="/#beneficios">Devoluciones</a></li>
                <li><a href="/#nosotros">Guía de tallas</a></li>
              </ul>
            </div>
            <div>
              <h4>EMPRESA</h4>
              <ul>
                <li><a href="/#nosotros">Nosotros</a></li>
                <li><a href="/login.html">Mi cuenta</a></li>
                <li><a href="/admin.html">Administración</a></li>
                <li><a href="/api/health" target="_blank" rel="noopener">Estado del sistema</a></li>
              </ul>
            </div>
            <div>
              <h4>NEWSLETTER</h4>
              <p style="margin:0">Recibe lanzamientos, ediciones limitadas y ofertas exclusivas.</p>
              <form class="newsletter" id="newsletter-form">
                <input type="email" name="email" placeholder="Tu correo electrónico" required aria-label="Correo">
                <button type="submit" aria-label="Suscribirme">${icon.arrow}</button>
              </form>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} Under Caps S.A.S. Todos los derechos reservados.</span>
            <span id="sys-status"><i class="status-dot"></i>Verificando servicio…</span>
          </div>
        </div>
      </footer>`;

    $('#newsletter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.target.email;
      try {
        const r = await api('/newsletter', { method: 'POST', body: { email: input.value } });
        toast(r.message);
        input.value = '';
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    });

    // Indicador de estado: App Service + MongoDB
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => {
        const on = h.database === 'conectado';
        $('#sys-status').innerHTML = `<i class="status-dot ${on ? 'on' : 'off'}"></i>Servidor en línea · Base de datos ${esc(h.database)}`;
      })
      .catch(() => { $('#sys-status').innerHTML = '<i class="status-dot off"></i>Servidor no disponible'; });
  }

  // Imagen de respaldo si una foto no carga
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (img.tagName === 'IMG' && !img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = '/img/placeholder.svg';
      }
    },
    true
  );

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
  });

  return { api, money, esc, $, $$, params, fmtDate, toast, icon, cart, getUser, logout, productCard, bindAddButtons, skeletons, FREE_SHIPPING_FROM };
})();
