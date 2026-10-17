(function () {
  'use strict';

  const API = '/api';
  const TOKEN_KEY = 'ecofresh_token';
  const CART_KEY = 'ecofresh_cart';
  const USER_KEY = 'ecofresh_user';

  // ========== Helpers ==========
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setAuth(user, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    updateHeaderAuth();
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateHeaderAuth();
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Помилка сервера');
    return data;
  }

  function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function updateHeaderAuth() {
    const user = getUser();
    const el = document.querySelector('.user-btn');
    if (!el) return;
    if (user) {
      el.innerHTML = `👤 ${user.name.split(' ')[0]}`;
      el.title = user.email;
      el.onclick = () => { location.href = '/account.html'; };
    } else {
      el.innerHTML = '👤';
      el.title = 'Увійти';
      el.onclick = () => { location.href = '/login.html'; };
    }
  }

  // ========== Mobile nav ==========
  function initMobileNav() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      nav.classList.toggle('nav--open');
      toggle.textContent = nav.classList.contains('nav--open') ? '✕' : '☰';
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('nav--open');
        toggle.textContent = '☰';
      });
    });
  }

  // ========== Catalog ==========
  async function initCatalog() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const countEl = document.getElementById('products-count');
    const form = document.getElementById('filters-form');

    async function load() {
      const params = new URLSearchParams();
      if (form) {
        const cat = form.category?.value;
        const min = form.minPrice?.value;
        const max = form.maxPrice?.value;
        const cert = form.certificate?.value;
        const farmer = form.farmer?.value;
        const sort = form.sort?.value;
        if (cat) params.set('category', cat);
        if (min) params.set('minPrice', min);
        if (max) params.set('maxPrice', max);
        if (cert) params.set('certificate', cert);
        if (farmer) params.set('farmer', farmer);
        if (sort) params.set('sort', sort);
      }
      try {
        const data = await api('/products?' + params.toString());
        if (countEl) countEl.textContent = data.count + ' товарів';
        grid.innerHTML = data.products.map(p => `
          <article class="product-card">
            <a href="/product.html?id=${p.slug}">
              <img src="${p.image}" alt="${p.name}" loading="lazy">
            </a>
            <div class="product-card-body">
              ${p.certificate ? `<span class="badge">${p.certificate}</span>` : ''}
              <h3><a href="/product.html?id=${p.slug}">${p.name}</a></h3>
              <div class="meta">${p.farmer || ''} · ${p.category}</div>
              <div class="price">${p.price.toFixed(2)} ₴</div>
              <button class="btn btn-primary btn-block" data-add="${p.id}" data-slug="${p.slug}" data-name="${p.name}" data-price="${p.price}" data-image="${p.image}">
                В кошик
              </button>
            </div>
          </article>
        `).join('') || '<div class="empty-state"><h3>Нічого не знайдено</h3><p>Спробуйте змінити фільтри</p></div>';

        grid.querySelectorAll('[data-add]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            addToCart({
              product_id: Number(btn.dataset.add),
              slug: btn.dataset.slug,
              name: btn.dataset.name,
              price: Number(btn.dataset.price),
              image: btn.dataset.image,
              quantity: 1
            });
          });
        });
      } catch (err) {
        grid.innerHTML = `<div class="empty-state"><h3>Помилка завантаження</h3><p>${err.message}</p></div>`;
      }
    }

    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); load(); });
      form.querySelector('[data-reset]')?.addEventListener('click', () => {
        form.reset();
        load();
      });
    }
    load();
  }

  function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(c => c.product_id === item.product_id);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + (item.quantity || 1));
    } else {
      cart.push({ ...item, quantity: item.quantity || 1 });
    }
    saveCart(cart);
    showToast(`${item.name} додано до кошика`);
  }

  // ========== Product page ==========
  async function initProductPage() {
    const container = document.getElementById('product-detail');
    if (!container) return;
    const params = new URLSearchParams(location.search);
    const slug = params.get('id');
    if (!slug) {
      container.innerHTML = '<div class="empty-state"><h3>Товар не вказано</h3></div>';
      return;
    }
    try {
      const p = await api('/products/' + slug);
      container.innerHTML = `
        <div class="product-gallery">
          <img id="main-img" src="${p.image}" alt="${p.name}">
          <div class="gallery-thumbs">
            ${(p.gallery && p.gallery.length ? p.gallery : [p.image]).map((src, i) =>
              `<img src="${src}" alt="" class="${i === 0 ? 'active' : ''}" data-src="${src}">`
            ).join('')}
          </div>
        </div>
        <div class="product-info">
          ${p.certificate ? `<span class="badge">${p.certificate}</span>` : ''}
          <h1>${p.name}</h1>
          <div class="meta">${p.farmer} · ${p.category}</div>
          <div class="price">${p.price.toFixed(2)} ₴</div>
          <p class="description">${p.description || ''}</p>
          <p class="meta">${p.details || ''}</p>
          <div class="qty-selector" style="margin:1rem 0">
            <button type="button" data-qty="-">−</button>
            <span id="qty">1</span>
            <button type="button" data-qty="+">+</button>
          </div>
          <button class="btn btn-primary" id="add-to-cart">Додати в кошик</button>
        </div>
      `;

      document.querySelectorAll('.gallery-thumbs img').forEach(img => {
        img.addEventListener('click', () => {
          document.getElementById('main-img').src = img.dataset.src;
          document.querySelectorAll('.gallery-thumbs img').forEach(i => i.classList.remove('active'));
          img.classList.add('active');
        });
      });

      let qty = 1;
      const qtyEl = document.getElementById('qty');
      document.querySelectorAll('[data-qty]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.qty === '+') qty = Math.min(99, qty + 1);
          else qty = Math.max(1, qty - 1);
          qtyEl.textContent = qty;
        });
      });

      document.getElementById('add-to-cart').addEventListener('click', () => {
        addToCart({
          product_id: p.id,
          slug: p.slug,
          name: p.name,
          price: p.price,
          image: p.image,
          quantity: qty
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Помилка</h3><p>${err.message}</p></div>`;
    }
  }

  // ========== Cart ==========
  function initCart() {
    const list = document.getElementById('cart-list');
    if (!list) return;

    function render() {
      const cart = getCart();
      if (cart.length === 0) {
        list.innerHTML = '<div class="empty-state"><h3>Кошик порожній</h3><p><a href="/catalog.html">Перейти до каталогу</a></p></div>';
        document.getElementById('cart-summary')?.style.setProperty('display', 'none');
        return;
      }
      document.getElementById('cart-summary')?.style.setProperty('display', 'block');

      list.innerHTML = cart.map((item, idx) => `
        <div class="cart-item" data-idx="${idx}">
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-item-info">
            <h3><a href="/product.html?id=${item.slug}">${item.name}</a></h3>
            <div class="price">${item.price.toFixed(2)} ₴</div>
            <div class="qty-selector">
              <button type="button" data-action="minus">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-action="plus">+</button>
            </div>
          </div>
          <div>
            <strong>${(item.price * item.quantity).toFixed(2)} ₴</strong>
            <button type="button" class="btn btn-ghost btn-sm" data-action="remove" title="Видалити">✕</button>
          </div>
        </div>
      `).join('');

      const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
      const delivery = 50;
      document.getElementById('subtotal').textContent = subtotal.toFixed(2) + ' ₴';
      document.getElementById('delivery').textContent = delivery.toFixed(2) + ' ₴';
      document.getElementById('total').textContent = (subtotal + delivery).toFixed(2) + ' ₴';

      list.querySelectorAll('.cart-item').forEach(el => {
        const idx = Number(el.dataset.idx);
        el.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', () => {
            const cart = getCart();
            const action = btn.dataset.action;
            if (action === 'plus') {
              cart[idx].quantity = Math.min(99, cart[idx].quantity + 1);
            } else if (action === 'minus') {
              if (cart[idx].quantity <= 1) {
                if (confirm('Видалити товар з кошика?')) cart.splice(idx, 1);
              } else {
                cart[idx].quantity--;
              }
            } else if (action === 'remove') {
              if (confirm('Видалити товар з кошика?')) cart.splice(idx, 1);
            }
            saveCart(cart);
            render();
          });
        });
      });
    }
    render();
  }

  // ========== Checkout ==========
  function initCheckout() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    const cart = getCart();
    if (cart.length === 0) {
      location.href = '/cart.html';
      return;
    }

    const user = getUser();
    if (user) {
      form.name.value = user.name || '';
      form.email.value = user.email || '';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(form);

      const name = form.name.value.trim();
      const phone = form.phone.value.trim().replace(/\s/g, '');
      const email = form.email.value.trim();
      const address = form.address.value.trim();
      const delivery = form.delivery?.value || 'nova_poshta';
      const payment = form.payment?.value || 'cash';

      let valid = true;
      if (name.length < 2) { showError(form.name, 'Мінімум 2 символи'); valid = false; }
      if (!/^\+?380\d{9}$/.test(phone)) { showError(form.phone, 'Формат: +380XXXXXXXXX'); valid = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError(form.email, 'Невірний email'); valid = false; }
      if (address.length < 5) { showError(form.address, 'Вкажіть повну адресу'); valid = false; }
      if (!valid) return;

      if (!getToken()) {
        showToast('Увійдіть або зареєструйтесь для оформлення', 'error');
        setTimeout(() => location.href = '/login.html', 1500);
        return;
      }

      try {
        const data = await api('/orders', {
          method: 'POST',
          body: JSON.stringify({
            items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity })),
            delivery_address: address,
            delivery_method: delivery,
            payment_method: payment,
            phone
          })
        });
        saveCart([]);
        location.href = `/success.html?order=${data.order_id}&total=${data.total}`;
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function showError(input, msg) {
    input.classList.add('input--error');
    let err = input.parentElement.querySelector('.error-message');
    if (!err) {
      err = document.createElement('div');
      err.className = 'error-message';
      input.parentElement.appendChild(err);
    }
    err.textContent = msg;
  }

  function clearErrors(form) {
    form.querySelectorAll('.input--error').forEach(el => el.classList.remove('input--error'));
    form.querySelectorAll('.error-message').forEach(el => el.remove());
  }

  // ========== Auth forms ==========
  function initAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(loginForm);
        try {
          const data = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: loginForm.email.value.trim(),
              password: loginForm.password.value
            })
          });
          setAuth(data.user, data.token);
          showToast('Вітаємо, ' + data.user.name + '!');
          setTimeout(() => location.href = '/account.html', 800);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(registerForm);
        const name = registerForm.name.value.trim();
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value;
        const confirm = registerForm.confirm?.value;

        if (name.length < 2) { showError(registerForm.name, 'Мінімум 2 символи'); return; }
        if (password.length < 8) { showError(registerForm.password, 'Мінімум 8 символів'); return; }
        if (confirm && password !== confirm) { showError(registerForm.confirm, 'Паролі не збігаються'); return; }

        try {
          const data = await api('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
          });
          setAuth(data.user, data.token);
          showToast('Реєстрація успішна! Вітаємо, ' + data.user.name);
          setTimeout(() => location.href = '/account.html', 800);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }

  // ========== Account ==========
  async function initAccount() {
    const greeting = document.getElementById('account-greeting');
    const ordersEl = document.getElementById('orders-list');
    if (!greeting && !ordersEl) return;

    const user = getUser();
    if (!user || !getToken()) {
      location.href = '/login.html';
      return;
    }

    if (greeting) {
      greeting.textContent = `Вітаємо, ${user.name}!`;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearAuth();
        location.href = '/';
      });
    }

    if (ordersEl) {
      try {
        const orders = await api('/orders');
        if (orders.length === 0) {
          ordersEl.innerHTML = '<div class="empty-state"><h3>Замовлень поки немає</h3><p><a href="/catalog.html">Почати покупки</a></p></div>';
          return;
        }
        ordersEl.innerHTML = orders.map(o => `
          <div class="order-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
              <strong>Замовлення #${o.id}</strong>
              <span class="badge">${o.status}</span>
            </div>
            <div class="meta">${new Date(o.created_at).toLocaleString('uk-UA')} · ${o.total.toFixed(2)} ₴</div>
            <div style="margin-top:0.5rem">
              ${(o.items || []).map(i => `${i.name} × ${i.quantity}`).join(', ')}
            </div>
          </div>
        `).join('');
      } catch (err) {
        ordersEl.innerHTML = `<p class="error-message">${err.message}</p>`;
      }
    }
  }

  // ========== Success ==========
  function initSuccess() {
    const params = new URLSearchParams(location.search);
    const order = params.get('order');
    const total = params.get('total');
    const el = document.getElementById('order-info');
    if (el && order) {
      el.innerHTML = `Номер замовлення: <strong>#${order}</strong><br>Сума: <strong>${Number(total || 0).toFixed(2)} ₴</strong>`;
    }
  }

  // ========== Home products ==========
  async function initHomeProducts() {
    const grid = document.getElementById('home-products');
    if (!grid) return;
    try {
      const data = await api('/products?sort=popular');
      const products = data.products.slice(0, 4);
      grid.innerHTML = products.map(p => `
        <article class="product-card">
          <a href="/product.html?id=${p.slug}"><img src="${p.image}" alt="${p.name}" loading="lazy"></a>
          <div class="product-card-body">
            <h3><a href="/product.html?id=${p.slug}">${p.name}</a></h3>
            <div class="price">${p.price.toFixed(2)} ₴</div>
            <button class="btn btn-primary btn-block" data-add="${p.id}" data-slug="${p.slug}" data-name="${p.name}" data-price="${p.price}" data-image="${p.image}">В кошик</button>
          </div>
        </article>
      `).join('');
      grid.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          addToCart({
            product_id: Number(btn.dataset.add),
            slug: btn.dataset.slug,
            name: btn.dataset.name,
            price: Number(btn.dataset.price),
            image: btn.dataset.image,
            quantity: 1
          });
        });
      });
    } catch {}
  }

  // ========== Init ==========
  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    updateCartBadge();
    updateHeaderAuth();
    initCatalog();
    initProductPage();
    initCart();
    initCheckout();
    initAuth();
    initAccount();
    initSuccess();
    initHomeProducts();
  });
})();
