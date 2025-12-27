// 在 js/customer.js 中需要实现以下功能：

// 初始化顾客页面
function initCustomerPage() {
    loadProducts(); // 加载商品
    updateCartDisplay(); // 更新购物车显示
}

// 更新购物车显示
function updateCartDisplay() {
    const cart = getCartFromStorage(); // 从本地存储获取购物车数据

    // 更新导航栏购物车数量
    document.getElementById('cartCount').textContent = cart.items.length;
    document.getElementById('sideCartCount').textContent = cart.items.length;

    // 更新主内容区购物车
    updateMainCart(cart);

    // 更新侧边栏购物车
    updateSidebarCart(cart);

    // 显示/隐藏购物车摘要
    const cartSummary = document.getElementById('cartSummary');
    cartSummary.style.display = cart.items.length > 0 ? 'block' : 'none';
}

// 更新主内容区购物车
function updateMainCart(cart) {
    const cartContainer = document.getElementById('cartContainer');

    if (cart.items.length === 0) {
        cartContainer.innerHTML = '<p>购物车为空</p>';
        return;
    }

    let html = `
        <div class="cart-items">
            <div class="cart-header">
                <span>商品</span>
                <span>单价</span>
                <span>数量</span>
                <span>小计</span>
                <span>操作</span>
            </div>
    `;

    cart.items.forEach(item => {
        html += `
            <div class="cart-item" data-id="${item.id}">
                <div class="item-info">
                    
                    <span>${item.name}</span>
                </div>
                <div class="item-price">¥${item.price.toFixed(2)}</div>
                <div class="item-quantity">
                    <button onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
                <div class="item-total">¥${(item.price * item.quantity).toFixed(2)}</div>
                <div class="item-actions">
                    <button onclick="removeFromCart(${item.id})" class="remove-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    cartContainer.innerHTML = html;

    // 更新总价
    document.getElementById('cartTotal').textContent = `¥${cart.total.toFixed(2)}`;
}

// 更新侧边栏购物车
function updateSidebarCart(cart) {
    const sidebarCartItems = document.getElementById('sidebarCartItems');

    if (cart.items.length === 0) {
        sidebarCartItems.innerHTML = '<p class="empty-cart">购物车为空</p>';
        document.getElementById('sidebarTotal').textContent = '¥0.00';
        return;
    }

    let html = '';
    cart.items.forEach(item => {
        html += `
            <div class="sidebar-cart-item" data-id="${item.id}">
                
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <div class="item-price">¥${item.price.toFixed(2)}</div>
                    <div class="item-quantity">
                        <span>数量: ${item.quantity}</span>
                        <button onclick="removeFromCart(${item.id})" class="remove-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    sidebarCartItems.innerHTML = html;
    document.getElementById('sidebarTotal').textContent = `¥${cart.total.toFixed(2)}`;
}

// 从本地存储获取购物车数据
function getCartFromStorage() {
    const cartJSON = localStorage.getItem('wuwumall_cart');
    return cartJSON ? JSON.parse(cartJSON) : { items: [], total: 0 };
}

// 切换购物车侧滑面板显示
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('active');
}

// 切换标签页显示
function showTab(tabName) {
    // 隐藏所有标签页
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 移除所有导航项的活动状态
    document.querySelectorAll('.side-nav a').forEach(nav => {
        nav.classList.remove('active');
    });

    // 显示选中的标签页
    document.getElementById(tabName + 'Tab').classList.add('active');

    // 设置对应的导航项为活动状态
    event.target.closest('a').classList.add('active');

    // 如果是购物车标签，更新显示
    if (tabName === 'cart') {
        updateCartDisplay();
    }
}