// js/products.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('products.js 已加载');

    // 商品数据
    const productsData = [
        {
            id: 1,
            name: "华为Mate 60 Pro",
            price: 6999,
            originalPrice: 7999,
            image: "📱",
            category: "electronics",
            description: "旗舰智能手机，麒麟9000S芯片",
            stock: 50,
            sales: 1250,
            isHot: true,
            isOnSale: true,
            tags: ["热门", "限时特价"]
        },
        {
            id: 2,
            name: "iPhone 15 Pro",
            price: 8999,
            originalPrice: 9999,
            image: "📱",
            category: "electronics",
            description: "苹果最新旗舰手机",
            stock: 30,
            sales: 980,
            isHot: true,
            isOnSale: false,
            tags: ["热门"]
        },
        {
            id: 3,
            name: "小米电视 75寸",
            price: 5999,
            originalPrice: 6999,
            image: "📺",
            category: "electronics",
            description: "4K超高清智能电视",
            stock: 20,
            sales: 320,
            isHot: false,
            isOnSale: true,
            tags: ["限时特价"]
        },
        {
            id: 4,
            name: "耐克运动鞋",
            price: 699,
            originalPrice: 899,
            image: "👟",
            category: "fashion",
            description: "专业运动跑步鞋",
            stock: 100,
            sales: 850,
            isHot: true,
            isOnSale: true,
            tags: ["热门", "新品"]
        },
        {
            id: 5,
            name: "智能扫地机器人",
            price: 2999,
            originalPrice: 3999,
            image: "🤖",
            category: "home",
            description: "全自动智能清扫",
            stock: 25,
            sales: 420,
            isHot: false,
            isOnSale: true,
            tags: ["限时特价"]
        }
    ];

    // 显示商品
    function displayProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) {
            console.error('找不到 productsGrid 元素');
            return;
        }

        console.log('开始显示商品，数量：', productsData.length);

        productsGrid.innerHTML = productsData.map(product => `
      <div class="product-card">
        <div class="product-image">${product.image}</div>
        ${product.isOnSale ? '<div class="sale-badge">特价</div>' : ''}
        ${product.isHot ? '<div class="hot-badge">热门</div>' : ''}
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="product-price">
            <span class="current-price">¥${product.price}</span>
            ${product.originalPrice > product.price ?
            `<span class="original-price">¥${product.originalPrice}</span>` : ''}
          </div>
          <div class="product-meta">
            <span class="sales">已售 ${product.sales}</span>
            <span class="stock">库存 ${product.stock}</span>
          </div>
          <button class="add-to-cart-btn" data-product-id="${product.id}">
            <i class="fas fa-cart-plus"></i> 加入购物车
          </button>
        </div>
      </div>
    `).join('');

        console.log('商品显示完成');
    }

    // 初始化
    displayProducts();

    // 暴露函数到全局
    window.displayProducts = displayProducts;
    window.productsData = productsData;
});