/* Página de tienda / catálogo con filtros */
(async () => {
  const { api, productCard, bindAddButtons, skeletons, esc, $, params } = UC;

  const state = {
    cat: params().get('cat') || '',
    q: params().get('q') || '',
    sort: params().get('sort') || '',
    sale: params().get('sale') === 'true',
  };

  const grid = $('#products');
  let products = [];
  bindAddButtons(grid, { find: (fn) => products.find(fn) });

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.cat) p.set('cat', state.cat);
    if (state.q) p.set('q', state.q);
    if (state.sort) p.set('sort', state.sort);
    if (state.sale) p.set('sale', 'true');
    history.replaceState(null, '', '/tienda.html' + (p.toString() ? '?' + p : ''));
  }

  function renderTitle() {
    let title = state.cat || 'Todas las gorras';
    if (state.sale) title = state.cat ? `${state.cat} en oferta` : 'Ofertas';
    if (state.q) title = `Resultados para “${state.q}”`;
    $('#title').textContent = title;
    $('#crumb').textContent = title;
    document.title = `${title} | Under Caps`;
  }

  async function loadCategories() {
    const { categories } = await api('/products/categories');
    const total = categories.reduce((s, c) => s + c.count, 0);
    const list = [{ name: '', label: 'Todas', count: total }, ...categories.map((c) => ({ ...c, label: c.name }))];
    $('#cat-filters').innerHTML = list
      .map(
        (c) =>
          `<li><button data-cat="${esc(c.name)}" class="${state.cat === c.name ? 'active' : ''}">${esc(c.label)} <span>${c.count}</span></button></li>`
      )
      .join('');
  }

  async function loadProducts() {
    grid.innerHTML = skeletons(6);
    const qs = new URLSearchParams();
    if (state.cat) qs.set('category', state.cat);
    if (state.q) qs.set('q', state.q);
    if (state.sort) qs.set('sort', state.sort);
    if (state.sale) qs.set('sale', 'true');
    try {
      ({ products } = await api('/products?' + qs));
      $('#count').textContent = `${products.length} producto${products.length === 1 ? '' : 's'}`;
      grid.innerHTML = products.length
        ? products.map(productCard).join('')
        : `<div class="empty" style="grid-column:1/-1"><h3>No encontramos gorras</h3><p>Prueba con otro filtro o búsqueda.</p></div>`;
    } catch (err) {
      $('#count').textContent = '';
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Error al cargar</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  $('#cat-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.cat = btn.dataset.cat;
    state.q = '';
    document.querySelectorAll('#cat-filters button').forEach((b) => b.classList.toggle('active', b === btn));
    syncUrl(); renderTitle(); loadProducts();
  });

  const saleBtn = $('[data-sale]');
  saleBtn.classList.toggle('active', state.sale);
  saleBtn.addEventListener('click', () => {
    state.sale = !state.sale;
    saleBtn.classList.toggle('active', state.sale);
    syncUrl(); renderTitle(); loadProducts();
  });

  $('#sort').value = state.sort;
  $('#sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    syncUrl(); loadProducts();
  });

  renderTitle();
  loadCategories().catch(() => {});
  loadProducts();
})();
