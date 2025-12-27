// 商家页面功能
let currentSellerTab = 'dashboard';

function initSellerPage() {
    loadSellerProducts();
    loadSellerOrders();
    loadSellerCustomers();
    initSalesChart();
    showSellerTab('dashboard');
}

function showSellerTab(tabName) {
    // 隐藏所有标签页
    document.querySelectorAll('.seller-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 移除所有标签的激活状态
    document.querySelectorAll('.seller-nav a').forEach(link => {
        link.classList.remove('active');
    });

    // 显示目标标签页
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // 激活对应的导航链接
    const targetLink = document.querySelector(`.seller-nav a[onclick*="${tabName}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }

    currentSellerTab = tabName;
}

function loadSellerProducts() {
    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;

    const products = getProducts();
    tableBody.innerHTML = '';

    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${product.id}</td>
            <td>${product.name}</td>
            <td>¥${product.price.toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>
                <span class="status-badge ${product.stock > 0 ? 'status-instock' : 'status-outstock'}">
                    ${product.stock > 0 ? '在售' : '缺货'}
                </span>
            </td>
            <td>
                <button class="btn btn-edit" onclick="editProduct(${product.id})">编辑</button>
                <button class="btn btn-delete" onclick="deleteProduct(${product.id})">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function loadSellerOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;

    const orders = getOrders();
    tableBody.innerHTML = '';

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customer?.username || '匿名用户'}</td>
            <td>¥${order.total.toFixed(2)}</td>
            <td>
                <span class="status-badge ${getOrderStatusClass(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-edit" onclick="viewOrder(${order.id})">查看</button>
                ${order.status === '待付款' ?
            `<button class="btn" onclick="updateOrderStatus(${order.id}, '已支付')">标记为已支付</button>` :
            order.status === '已支付' ?
                `<button class="btn" onclick="updateOrderStatus(${order.id}, '已发货')">标记为已发货</button>` :
                ''
        }
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function loadSellerCustomers() {
    const customersList = document.getElementById('customersList');
    if (!customersList) return;

    const orders = getOrders();
    const customers = {};

    // 从订单中提取客户信息
    orders.forEach(order => {
        if (order.customer) {
            const key = order.customer.phone;
            if (!customers[key]) {
                customers[key] = {
                    username: order.customer.username,
                    phone: order.customer.phone,
                    orderCount: 0,
                    totalSpent: 0
                };
            }
            customers[key].orderCount += 1;
            customers[key].totalSpent += order.total;
        }
    });

    customersList.innerHTML = '';

    Object.values(customers).forEach(customer => {
        const customerCard = document.createElement('div');
        customerCard.className = 'customer-card';
        customerCard.innerHTML = `
            <div class="customer-info">
                <h4>${customer.username}</h4>
                <p>电话: ${customer.phone}</p>
            </div>
            <div class="customer-stats">
                <div class="stat">
                    <span>订单数</span>
                    <strong>${customer.orderCount}</strong>
                </div>
                <div class="stat">
                    <span>消费总额</span>
                    <strong>¥${customer.totalSpent.toFixed(2)}</strong>
                </div>
            </div>
        `;
        customersList.appendChild(customerCard);
    });
}

function getOrderStatusClass(status) {
    switch(status) {
        case '待付款': return 'status-pending';
        case '已支付': return 'status-paid';
        case '已发货': return 'status-shipped';
        case '已完成': return 'status-completed';
        case '已取消': return 'status-cancelled';
        default: return '';
    }
}

function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    modal.style.display = 'flex';

    const form = document.getElementById('addProductForm');
    form.reset();
    form.onsubmit = function(e) {
        e.preventDefault();
        addNewProduct();
    };
}

function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
}

function addNewProduct() {
    const form = document.getElementById('addProductForm');
    const formData = new FormData(form);

    const newProduct = {
        id: Date.now(),
        name: formData.get('name') || '未命名商品',
        price: parseFloat(formData.get('price')) || 0,
        stock: parseInt(formData.get('stock')) || 0,
        description: formData.get('description') || '',
        category: 'electronics', // 默认为电子产品
        image: '📦' // 默认图标
    };

    const products = getProducts();
    products.push(newProduct);
    saveProducts(products);

    closeAddProductModal();
    loadSellerProducts();
    showToast('商品添加成功');
}

function editProduct(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);

    if (product) {
        const newName = prompt('请输入新的商品名称:', product.name);
        if (newName !== null) {
            product.name = newName;
        }

        const newPrice = prompt('请输入新的价格:', product.price);
        if (newPrice !== null) {
            product.price = parseFloat(newPrice) || product.price;
        }

        const newStock = prompt('请输入新的库存:', product.stock);
        if (newStock !== null) {
            product.stock = parseInt(newStock) || product.stock;
        }

        saveProducts(products);
        loadSellerProducts();
        showToast('商品信息已更新');
    }
}

function deleteProduct(productId) {
    if (confirm('确定要删除这个商品吗？')) {
        const products = getProducts();
        const filteredProducts = products.filter(p => p.id !== productId);
        saveProducts(filteredProducts);
        loadSellerProducts();
        showToast('商品已删除');
    }
}

function viewOrder(orderId) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);

    if (order) {
        const itemsText = order.items.map(item =>
            `${item.name} × ${item.quantity} = ¥${(item.price * item.quantity).toFixed(2)}`
        ).join('\n');

        alert(`订单详情 #${order.id}\n\n客户: ${order.customer?.username || '匿名用户'}\n电话: ${order.customer?.phone || '未提供'}\n状态: ${order.status}\n下单时间: ${new Date(order.createdAt).toLocaleString()}\n\n商品:\n${itemsText}\n\n总计: ¥${order.total.toFixed(2)}`);
    }
}
function updateOrderStatus(orderId, newStatus) {
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;

        // 如果是已发货状态，记录发货时间
        if (newStatus === '已发货') {
            orders[orderIndex].shippedAt = new Date().toISOString();
        }

        // 如果是已完成状态，记录完成时间
        if (newStatus === '已完成') {
            orders[orderIndex].completedAt = new Date().toISOString();
        }

        saveOrders(orders);
        loadSellerOrders();
        showToast(`订单 #${orderId} 状态已更新为 ${newStatus}`);

        // 如果是商家发货，发送邮件通知顾客
        if (newStatus === '已发货') {
            sendShippingNotification(orderId);
        }
    }
}

function sendShippingNotification(orderId) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);

    if (order) {
        console.log('=== 模拟发货通知邮件 ===');
        console.log('收件人: customer@example.com');
        console.log('主题: 您的订单已发货 #' + orderId);
        console.log('内容:');
        console.log('尊敬的顾客，您的订单已发货！');
        console.log('订单号: #' + orderId);
        console.log('发货时间: ' + new Date().toLocaleString());
        console.log('预计送达: ' + new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString());
        console.log('======================');
    }
}

function initSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 模拟销售数据
    const last7Days = [];
    const salesData = [];
    const orderCounts = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));

        // 生成随机销售数据
        salesData.push(Math.floor(Math.random() * 10000) + 5000);
        orderCounts.push(Math.floor(Math.random() * 50) + 20);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [
                {
                    label: '销售额 (元)',
                    data: salesData,
                    borderColor: '#e60012',
                    backgroundColor: 'rgba(230, 0, 18, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '订单数',
                    data: orderCounts,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '最近7天销售趋势',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 10000) {
                                return '¥' + (value / 10000).toFixed(1) + '万';
                            }
                            return '¥' + value;
                        }
                    }
                }
            }
        }
    });
}

// 模态框关闭事件
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('addProductModal');

    // 点击模态框外部关闭
    modal?.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeAddProductModal();
        }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeAddProductModal();
        }
    });
});