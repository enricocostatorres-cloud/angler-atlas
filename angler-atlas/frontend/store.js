// Store page logic
let allProducts = [];
let isPremium = false;

document.addEventListener('DOMContentLoaded', async () => {
    await checkPremium();
    await loadProducts();
    setupStoreListeners();
    initDarkMode();
    renderCart();
});

async function checkPremium() {
    try {
        const user = await getCurrentUser();
        if (user && user.preferences && user.preferences.subscriptionTier === 'premium') {
            isPremium = true;
        }
    } catch (e) {
        // ignore
    }
}

async function loadProducts() {
    try {
        const result = await getStoreProducts();
        allProducts = result.products || [];
        renderProducts(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProducts(products) {
    const grid = document.getElementById('storeGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);';
        p.textContent = 'No products found in this category.';
        grid.appendChild(p);
        return;
    }

    products.forEach(product => {
        grid.appendChild(createProductCard(product));
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Premium badge
    if (isPremium) {
        const badge = document.createElement('div');
        badge.className = 'premium-badge';
        badge.textContent = '10% OFF';
        card.appendChild(badge);
    }

    const img = document.createElement('img');
    img.className = 'product-image';
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';

    const info = document.createElement('div');
    info.className = 'product-info';

    const name = document.createElement('div');
    name.className = 'product-name';
    name.textContent = product.name;

    const desc = document.createElement('div');
    desc.className = 'product-desc';
    desc.textContent = product.description;

    // Rating stars
    const rating = document.createElement('div');
    rating.className = 'product-rating';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        star.className = i <= product.rating ? 'fa-solid fa-star' : 'fa-solid fa-star empty';
        rating.appendChild(star);
    }

    const priceRow = document.createElement('div');
    priceRow.className = 'product-price-row';

    const price = document.createElement('span');
    price.className = 'product-price';
    if (isPremium) {
        const discounted = (product.price * 0.9).toFixed(2);
        price.innerHTML = '';
        const oldPrice = document.createElement('s');
        oldPrice.style.cssText = 'font-size:0.8rem; color:var(--text-muted); margin-right:0.3rem; font-weight:400;';
        oldPrice.textContent = '$' + product.price.toFixed(2);
        price.appendChild(oldPrice);
        price.appendChild(document.createTextNode('$' + discounted));
    } else {
        price.textContent = '$' + product.price.toFixed(2);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'add-to-cart-btn';
    addBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add';
    addBtn.addEventListener('click', () => addToCart(product));

    priceRow.appendChild(price);
    priceRow.appendChild(addBtn);

    info.appendChild(name);
    info.appendChild(desc);
    info.appendChild(rating);
    info.appendChild(priceRow);

    card.appendChild(img);
    card.appendChild(info);
    return card;
}

// ── Cart Logic ──────────────────────────────────────────────────
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('anglerCart')) || [];
    } catch { return []; }
}

function saveCart(cart) {
    localStorage.setItem('anglerCart', JSON.stringify(cart));
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        const unitPrice = isPremium ? parseFloat((product.price * 0.9).toFixed(2)) : product.price;
        cart.push({ id: product.id, name: product.name, price: unitPrice, qty: 1 });
    }
    saveCart(cart);
    renderCart();
}

function removeFromCart(productId) {
    const cart = getCart().filter(i => i.id !== productId);
    saveCart(cart);
    renderCart();
}

function updateQty(productId, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty < 1) item.qty = 1;
    saveCart(cart);
    renderCart();
}

function renderCart() {
    const cart = getCart();
    const badge = document.getElementById('cartBadge');
    const itemsEl = document.getElementById('cartItems');
    const footerEl = document.getElementById('cartFooter');

    const totalItems = cart.reduce((s, i) => s + i.qty, 0);
    badge.textContent = totalItems;

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
        footerEl.style.display = 'none';
        return;
    }

    itemsEl.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const lineTotal = item.price * item.qty;
        subtotal += lineTotal;

        const row = document.createElement('div');
        row.className = 'cart-item';

        row.innerHTML = '';
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cart-item-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'cart-item-name';
        nameEl.textContent = item.name;
        const priceEl = document.createElement('div');
        priceEl.className = 'cart-item-price';
        priceEl.textContent = '$' + item.price.toFixed(2) + ' each';
        infoDiv.appendChild(nameEl);
        infoDiv.appendChild(priceEl);

        const qtyDiv = document.createElement('div');
        qtyDiv.className = 'cart-item-qty';
        const minusBtn = document.createElement('button');
        minusBtn.className = 'cart-qty-btn';
        minusBtn.textContent = '-';
        minusBtn.addEventListener('click', () => updateQty(item.id, -1));
        const qtySpan = document.createElement('span');
        qtySpan.textContent = item.qty;
        const plusBtn = document.createElement('button');
        plusBtn.className = 'cart-qty-btn';
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', () => updateQty(item.id, 1));
        qtyDiv.appendChild(minusBtn);
        qtyDiv.appendChild(qtySpan);
        qtyDiv.appendChild(plusBtn);

        const totalEl = document.createElement('span');
        totalEl.className = 'cart-item-total';
        totalEl.textContent = '$' + lineTotal.toFixed(2);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'cart-item-remove';
        removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        removeBtn.addEventListener('click', () => removeFromCart(item.id));

        row.appendChild(infoDiv);
        row.appendChild(qtyDiv);
        row.appendChild(totalEl);
        row.appendChild(removeBtn);
        itemsEl.appendChild(row);
    });

    const shipping = subtotal >= 50 ? 0 : 5.99;
    const tax = parseFloat((subtotal * 0.10).toFixed(2));
    const total = subtotal + shipping + tax;

    document.getElementById('cartSubtotal').textContent = '$' + subtotal.toFixed(2);
    document.getElementById('cartShipping').textContent = shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2);
    document.getElementById('cartTax').textContent = '$' + tax.toFixed(2);
    document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);
    footerEl.style.display = 'block';
}

// ── Store Listeners ─────────────────────────────────────────────
function setupStoreListeners() {
    // Category filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.category;
            renderProducts(cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat));
        });
    });

    // Cart open/close
    document.getElementById('cartToggleBtn').addEventListener('click', toggleCart);
    document.getElementById('cartCloseBtn').addEventListener('click', toggleCart);
    document.getElementById('cartOverlay').addEventListener('click', toggleCart);

    // Checkout
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        alert('Checkout coming soon!');
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
        window.location.href = '/';
    });
}

function toggleCart() {
    document.getElementById('cartPanel').classList.toggle('open');
    document.getElementById('cartOverlay').classList.toggle('open');
}

// Dark mode (same as other pages)
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;

    function applyTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        toggle.innerHTML = dark
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }

    const saved = localStorage.getItem('theme');
    applyTheme(saved === 'dark');

    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(!isDark);
    });
}
