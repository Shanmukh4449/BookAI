/**
 * SHARED UTILITIES v2.0
 */
const API_BASE   = '/api';
const SOCKET_URL = window.location.origin;

function getToken()   { return localStorage.getItem('token'); }
function getUser()    { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; }
function isLoggedIn() { return !!getToken(); }
function isAdmin()    { const u = getUser(); return u && u.role === 'admin'; }

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function requireAuth() {
  if (!isLoggedIn()) window.location.href = 'login.html';
}

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (response.status === 401) logout();
  return { response, data };
}

// ✅ FIX 10: Always generate valid Amazon link if platform_link is empty
function getPlatformLink(book) {
  if (book.platform_link && book.platform_link !== '#' && book.platform_link.trim() !== '') {
    return book.platform_link;
  }
  return `https://www.amazon.in/s?k=${encodeURIComponent(book.title + ' ' + book.author)}`;
}

function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  let stars = '';
  for (let i = 0; i < full;  i++) stars += '<i class="bi bi-star-fill text-warning"></i>';
  if (half)                        stars += '<i class="bi bi-star-half text-warning"></i>';
  for (let i = 0; i < empty; i++) stars += '<i class="bi bi-star text-warning"></i>';
  return stars;
}

function renderBookCard(book, wishlistIds = []) {
  const cover = book.cover_url && book.cover_url !== ''
    ? book.cover_url
    : `https://via.placeholder.com/200x280/667eea/ffffff?text=${encodeURIComponent((book.title||'').substring(0,10))}`;
  const inWish = wishlistIds.includes(String(book._id));
  // ✅ FIX 10: use getPlatformLink so Amazon link always works
  const link = getPlatformLink(book);
  return `
  <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
    <div class="card book-card h-100 shadow-sm" onclick="window.location.href='book-details.html?id=${book._id}'">
      <div class="book-cover-wrap">
        <img src="${cover}" class="card-img-top book-cover" alt="${book.title}"
          onerror="this.src='https://via.placeholder.com/200x280/667eea/ffffff?text=No+Cover'">
        <span class="genre-badge badge">${book.genre}</span>
        ${isLoggedIn() ? `
        <button class="wishlist-btn ${inWish ? 'active' : ''}"
          onclick="event.stopPropagation(); toggleWishlist('${book._id}', this)"
          title="${inWish ? 'Remove from Wishlist' : 'Add to Wishlist'}">
          <i class="bi bi-heart${inWish ? '-fill' : ''}"></i>
        </button>` : ''}
      </div>
      <div class="card-body d-flex flex-column">
        <h6 class="card-title fw-bold">${book.title}</h6>
        <p class="card-text text-muted small mb-1">by ${book.author}</p>
        <div class="mt-auto d-flex align-items-center justify-content-between">
          <small>${renderStars(book.rating || 0)}</small>
          <span class="badge bg-primary">${(book.rating || 0).toFixed(1)}</span>
        </div>
      </div>
    </div>
  </div>`;
}

async function toggleWishlist(bookId, btn) {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return; }
  const isActive = btn.classList.contains('active');
  try {
    if (isActive) {
      const { data } = await authFetch(`${API_BASE}/wishlist/remove/${bookId}`, { method: 'DELETE' });
      if (data.success) {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="bi bi-heart"></i>';
        showToast('Removed from wishlist', 'warning');
      }
    } else {
      const { data } = await authFetch(`${API_BASE}/wishlist/add`, {
        method: 'POST', body: JSON.stringify({ book_id: bookId })
      });
      if (data.success) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
        showToast('Added to wishlist! ❤️');
      } else {
        showToast(data.message, 'warning');
      }
    }
  } catch { showToast('Failed to update wishlist', 'error'); }
}

async function loadGenres() {
  try {
    const res  = await fetch(`${API_BASE}/genres`);
    const data = await res.json();
    return data.genres || [];
  } catch {
    return ['Fiction','Non-Fiction','Science','History','Romance','Thriller','Fantasy','Biography','Technology','Psychology'];
  }
}

async function populateGenreSelect(selectId, selectedValue = '') {
  const genres = await loadGenres();
  const sel    = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = genres.map(g =>
    `<option value="${g}" ${g === selectedValue ? 'selected' : ''}>${g}</option>`
  ).join('');
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;min-width:260px;';
    document.body.appendChild(container);
  }
  const id = 'toast-' + Date.now();
  const bg = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-warning';
  container.innerHTML += `
    <div id="${id}" class="toast align-items-center text-white ${bg} border-0 mb-2 show" style="border-radius:12px;">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button class="btn-close btn-close-white me-2 m-auto" onclick="document.getElementById('${id}').remove()"></button>
      </div>
    </div>`;
  setTimeout(() => { const el = document.getElementById(id); if (el) el.remove(); }, 4000);
}

function goBack() {
  if (document.referrer && document.referrer.includes(window.location.hostname)) history.back();
  else window.location.href = 'index.html';
}

function injectBackButton() {
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') return;
  const btn = document.createElement('button');
  btn.className = 'back-btn-global';
  btn.innerHTML = '<i class="bi bi-arrow-left me-1"></i> Back';
  btn.onclick   = goBack;
  document.body.appendChild(btn);
}

function initGlobalSearch() {
  const input = document.getElementById('global-search-input');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    }
  });
  if (window.location.pathname.includes('search.html')) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) input.value = q;
  }
}

function updateNavbar() {
  const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'block'; };
  const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
  if (isLoggedIn()) {
    hide('nav-login'); hide('nav-signup');
    show('nav-logout'); show('nav-dashboard'); show('nav-wishlist');
    if (isAdmin()) show('nav-admin');
  } else {
    hide('nav-logout'); hide('nav-dashboard'); hide('nav-wishlist'); hide('nav-admin');
  }
}

let _socket = null;

function getSocket() {
  if (!_socket && typeof io !== 'undefined') {
    _socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });
  }
  return _socket;
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  initGlobalSearch();
  injectBackButton();
});

// ================= OTP HELPERS =================

// Optional: auto trigger timer if user comes after OTP request
function initOTPPage() {
  const resendBtn = document.getElementById('resend-btn');
  if (resendBtn) {
    // you can auto start timer if needed
  }
}

document.addEventListener('DOMContentLoaded', initOTPPage);
