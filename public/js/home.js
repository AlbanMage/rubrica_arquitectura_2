/* Página de inicio */
(async () => {
  const { api, productCard, bindAddButtons, skeletons, esc, $, $$, icon } = UC;

  // Iconos de la franja de beneficios
  $$('[data-icon]').forEach((el) => (el.outerHTML = icon[el.dataset.icon]));

  const featuredEl = $('#featured');
  const newestEl = $('#newest');
  const catsEl = $('#categories');
  featuredEl.innerHTML = skeletons(4);
  newestEl.innerHTML = skeletons(4);

  try {
    const [{ categories }, { products: featured }, { products: all }] = await Promise.all([
      api('/products/categories'),
      api('/products?sort=populares&limit=8'),
      api('/products?sort=nuevos'),
    ]);
    // "Recién llegados": los más recientes que no aparecen ya en "más vendidas"
    const featuredIds = new Set(featured.map((p) => p._id));
    const newest = all.filter((p) => !featuredIds.has(p._id)).slice(0, 4);

    catsEl.innerHTML = categories
      .map(
        (c) => `
        <a class="cat" href="/tienda.html?cat=${encodeURIComponent(c.name)}">
          <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">
          <div class="cat-label"><strong>${esc(c.name)}</strong><span>${c.count}</span></div>
        </a>`
      )
      .join('');

    featuredEl.innerHTML = featured.slice(0, 8).map(productCard).join('');
    newestEl.innerHTML = newest.map(productCard).join('');
    bindAddButtons(featuredEl, featured);
    bindAddButtons(newestEl, newest);
  } catch (err) {
    const msg = `<div class="empty" style="grid-column:1/-1"><h3>No pudimos cargar el catálogo</h3><p>${esc(err.message)}</p></div>`;
    featuredEl.innerHTML = msg;
    newestEl.innerHTML = '';
  }
})();
