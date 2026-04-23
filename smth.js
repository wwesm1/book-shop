/* ──────────────────────────────────────────
     APPLICATION STATE
  ────────────────────────────────────────── */
  const state = {
    // Add runtime fields to each book
    books: CATALOGUE.map(b => ({ ...b, liked: false, inCart: false })),
    filters: { language: 'all', genre: 'all', price: 'all' },
    sort:   'default',
    search: ''
  };

  /* ──────────────────────────────────────────
     HELPER UTILITIES
  ────────────────────────────────────────── */

  /** Build filled/empty star HTML for a given rating (out of 5). */
  function starsHTML(rating) {
    const full  = Math.floor(rating);
    const empty = 5 - full;
    return `<span class="stars-full">${'★'.repeat(full)}</span>` +
           `<span class="stars-empty">${'★'.repeat(empty)}</span>`;
  }

  /** Map language key → short display label. */
  const LANG_LABEL = { english: 'EN', russian: 'RU', uzbek: 'UZ' };

  /** Pick up to 2 initial letters from a title for the no-image fallback. */
  function initials(title) {
    return title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  /** Gradient backgrounds for books without a cover image. */
  const NO_IMG_GRADIENTS = {
    english: 'linear-gradient(145deg, #0e1828, #0a1220)',
    russian: 'linear-gradient(145deg, #1a0e22, #110a18)',
    uzbek:   'linear-gradient(145deg, #0e1a0e, #091409)'
  };

  /* ──────────────────────────────────────────
     FILTER & SORT — returns visible books list
  ────────────────────────────────────────── */
  function getVisible() {
    let list = state.books.filter(book => {
      if (state.filters.language !== 'all' && book.language !== state.filters.language) return false;
      if (state.filters.genre    !== 'all' && book.genre    !== state.filters.genre)    return false;
      if (state.filters.price === 'cheaper'   && book.price >= 25) return false;
      if (state.filters.price === 'expensive' && book.price <  25) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        const matchTitle  = book.title.toLowerCase().includes(q);
        const matchAuthor = book.author.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }
      return true;
    });

    if (state.sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (state.sort === 'za') list = [...list].sort((a, b) => b.title.localeCompare(a.title));

    return list;
  }

  /* ──────────────────────────────────────────
     RENDER — inject book cards into the grid
  ────────────────────────────────────────── */
  function render() {
    const grid    = document.getElementById('booksGrid');
    const countEl = document.getElementById('bookCount');
    const visible = getVisible();

    countEl.textContent = visible.length;

    if (visible.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📚</div>
          <p class="empty-state__text">No books found</p>
          <p class="empty-state__sub">Try a different search or adjust the filters</p>
        </div>`;
      return;
    }

    grid.innerHTML = visible.map((book, idx) => {
      const hasCover  = !!book.image;
      const coverClass = hasCover ? '' : 'no-img';
      const coverData  = hasCover ? '' : `data-initials="${initials(book.title)}"`;
      const coverStyle = hasCover ? '' : `style="background:${NO_IMG_GRADIENTS[book.language] || NO_IMG_GRADIENTS.english}"`;
      const likeClass  = book.liked  ? 'liked'   : '';
      const cartClass  = book.inCart ? 'in-cart' : '';
      const cartLabel  = book.inCart ? '✓ Added'  : '+ Cart';
      const likeTitle  = book.liked  ? 'Unlike'   : 'Like';
      const likeFill   = book.liked  ? 'currentColor' : 'none';
      // Stagger card entrance animations
      const delay = (idx % 24) * 0.038;

      return `
      <article class="book-card" data-id="${book.id}" style="animation-delay:${delay}s">

        <div class="book-card__cover ${coverClass}" ${coverData} ${coverStyle}>
          ${hasCover ? `
            <img
              class="book-card__img"
              src="${book.image}"
              alt="${book.title}"
              loading="lazy"
              onerror="
                this.closest('.book-card__cover').classList.add('no-img');
                this.closest('.book-card__cover').dataset.initials='${initials(book.title)}';
                this.closest('.book-card__cover').style.background='${NO_IMG_GRADIENTS[book.language] || NO_IMG_GRADIENTS.english}';
                this.remove();
              "
            />` : ''}
          <div class="book-card__overlay"></div>
          <span class="book-card__lang">${LANG_LABEL[book.language] || 'XX'}</span>
          <button class="book-card__like ${likeClass}" data-id="${book.id}" title="${likeTitle}" aria-label="${likeTitle}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${likeFill}" stroke="currentColor" stroke-width="2.2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        <div class="book-card__body">
          <span class="book-card__genre genre--${book.genre}">
            ${book.genre.charAt(0).toUpperCase() + book.genre.slice(1)}
          </span>
          <h3 class="book-card__title">${book.title}</h3>
          <p  class="book-card__author">${book.author}</p>
          <div class="book-card__stars">
            ${starsHTML(book.rating)}
            <span class="rating-val">${book.rating}</span>
          </div>
          <div class="book-card__footer">
            <span class="book-card__price">$${book.price.toFixed(2)}</span>
            <button class="book-card__cart ${cartClass}" data-id="${book.id}" aria-label="Add ${book.title} to cart">
              ${cartLabel}
            </button>
          </div>
        </div>

      </article>`;
    }).join('');
  }

  /* ──────────────────────────────────────────
     CARD INTERACTION — event delegation
  ────────────────────────────────────────── */
  document.getElementById('booksGrid').addEventListener('click', e => {
    // Like button
    const likeBtn = e.target.closest('.book-card__like');
    if (likeBtn) {
      const book   = state.books.find(b => b.id === +likeBtn.dataset.id);
      book.liked   = !book.liked;
      updateBadges();
      render();
      toast(book.liked ? '♥' : '♡', book.liked ? `Liked "${book.title}"` : `Removed from liked`);
      return;
    }

    // Cart button
    const cartBtn = e.target.closest('.book-card__cart');
    if (cartBtn) {
      const book   = state.books.find(b => b.id === +cartBtn.dataset.id);
      book.inCart  = !book.inCart;
      updateBadges();
      render();
      toast('🛒', book.inCart ? `"${book.title}" added to cart` : `Removed from cart`);
    }
  });

  /* ──────────────────────────────────────────
     BADGE COUNTERS
  ────────────────────────────────────────── */
  function updateBadges() {
    const likeCount = state.books.filter(b => b.liked).length;
    const cartCount = state.books.filter(b => b.inCart).length;

    const lb = document.getElementById('likeBadge');
    const cb = document.getElementById('cartBadge');
    lb.textContent = likeCount; lb.classList.toggle('show', likeCount > 0);
    cb.textContent = cartCount; cb.classList.toggle('show', cartCount > 0);

    document.getElementById('likeNavBtn').classList.toggle('is-liked', likeCount > 0);
  }

  /* ──────────────────────────────────────────
     FILTER BUTTONS
  ────────────────────────────────────────── */
  document.querySelectorAll('.navbar__bottom [data-group]').forEach(group => {
    group.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const groupKey = group.dataset.group;   // 'language' | 'genre' | 'price' | 'sort'
      const value    = btn.dataset.val;

      if (groupKey === 'sort') {
        state.sort = value;
      } else {
        state.filters[groupKey] = value;
      }
      render();
    });
  });

  /* ──────────────────────────────────────────
     SEARCH — debounced
  ────────────────────────────────────────── */
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      render();
    }, 220);
  });

  /* ──────────────────────────────────────────
     MODALS
  ────────────────────────────────────────── */
  function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = '';       }

  // Close buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.modal))
  );
  // Click outside modal
  document.querySelectorAll('.modal-backdrop').forEach(backdrop =>
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(backdrop.id); })
  );

  /* Thumbnail helper for modals */
  function thumbHTML(book) {
    if (book.image) {
      return `<img class="modal-thumb" src="${book.image}" alt="${book.title}" onerror="this.style.background='#1a1e34'; this.removeAttribute('src')">`;
    }
    return `<div class="modal-thumb" style="background:${NO_IMG_GRADIENTS[book.language]};"></div>`;
  }

  /* Liked modal */
  document.getElementById('likeNavBtn').addEventListener('click', () => {
    const liked = state.books.filter(b => b.liked);
    const body  = document.getElementById('likeModalBody');

    if (!liked.length) {
      body.innerHTML = `<div class="modal-empty">No liked books yet ♡</div>`;
    } else {
      body.innerHTML = liked.map(b => `
        <div class="modal-row">
          ${thumbHTML(b)}
          <div class="modal-info">
            <div class="modal-book-title">${b.title}</div>
            <div class="modal-book-author">${b.author}</div>
            <div class="modal-book-price">$${b.price.toFixed(2)}</div>
          </div>
          <button class="modal-remove" data-unlike="${b.id}" title="Remove">✕</button>
        </div>`).join('');

      body.querySelectorAll('[data-unlike]').forEach(btn =>
        btn.addEventListener('click', () => {
          const book = state.books.find(b => b.id === +btn.dataset.unlike);
          if (book) { book.liked = false; updateBadges(); render(); }
          // Refresh modal
          document.getElementById('likeNavBtn').click();
        })
      );
    }
    openModal('likeModal');
  });

  /* Cart modal */
  document.getElementById('cartNavBtn').addEventListener('click', () => {
    const inCart = state.books.filter(b => b.inCart);
    const body   = document.getElementById('cartModalBody');
    const foot   = document.getElementById('cartFoot');

    if (!inCart.length) {
      body.innerHTML = `<div class="modal-empty">Your cart is empty 🛒</div>`;
      foot.style.display = 'none';
    } else {
      const total = inCart.reduce((sum, b) => sum + b.price, 0);
      body.innerHTML = inCart.map(b => `
        <div class="modal-row">
          ${thumbHTML(b)}
          <div class="modal-info">
            <div class="modal-book-title">${b.title}</div>
            <div class="modal-book-author">${b.author}</div>
            <div class="modal-book-price">$${b.price.toFixed(2)}</div>
          </div>
          <button class="modal-remove" data-remove="${b.id}" title="Remove">✕</button>
        </div>`).join('');

      document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
      foot.style.display = 'flex';

      body.querySelectorAll('[data-remove]').forEach(btn =>
        btn.addEventListener('click', () => {
          const book = state.books.find(b => b.id === +btn.dataset.remove);
          if (book) { book.inCart = false; updateBadges(); render(); }
          document.getElementById('cartNavBtn').click();
        })
      );
    }
    openModal('cartModal');
  });

  /* Checkout button — just a friendly alert for demo */
  document.querySelector('.modal-checkout-btn').addEventListener('click', () => {
    closeModal('cartModal');
    toast('✨', 'Thank you for your order!');
    state.books.forEach(b => (b.inCart = false));
    updateBadges();
    render();
  });

  /* ──────────────────────────────────────────
     TOAST NOTIFICATIONS
  ────────────────────────────────────────── */
  function toast(icon, message) {
    const wrap = document.getElementById('toastWrap');
    const el   = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="toast-ico">${icon}</span><span>${message}</span>`;
    wrap.appendChild(el);
    // Auto-remove
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  /* ──────────────────────────────────────────
     SCROLL-TO-TOP BUTTON
  ────────────────────────────────────────── */
  const scrollBtn = document.getElementById('scrollBtn');
  window.addEventListener('scroll', () => {
    scrollBtn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ──────────────────────────────────────────
     STARFIELD BACKGROUND — canvas animation
  ────────────────────────────────────────── */
  (function initStarfield() {
    const canvas = document.getElementById('starCanvas');
    const ctx    = canvas.getContext('2d');
    let stars    = [];

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      createStars();
    }

    function createStars() {
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / 6000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x:       Math.random() * canvas.width,
          y:       Math.random() * canvas.height,
          r:       Math.random() * 1.4 + 0.2,          // radius 0.2–1.6
          opacity: Math.random() * 0.7 + 0.15,
          speed:   Math.random() * 0.004 + 0.001,      // twinkle speed
          phase:   Math.random() * Math.PI * 2          // twinkle phase offset
        });
      }
    }

    let time = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.012;
      stars.forEach(s => {
        // Gentle twinkle via sine wave
        const alpha = s.opacity * (0.6 + 0.4 * Math.sin(time * s.speed * 300 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 210, 190, ${alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    draw();
  })();

  /* ──────────────────────────────────────────
     INITIAL RENDER
  ────────────────────────────────────────── */
  render();