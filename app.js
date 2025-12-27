/**
 * 应用主逻辑
 */

// 数据库管理
class WuwuMallDB {
    constructor() {
        this.dbName = 'WuwuMallDB';
        this.dbVersion = 1;
    }

    async init() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                console.log('IndexedDB不可用，使用LocalStorage');
                resolve(this);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('IndexedDB打开失败:', event.target.error);
                resolve(this);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB连接成功');
                resolve(this);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('数据库升级');

                // 创建购物车表
                if (!db.objectStoreNames.contains('cart')) {
                    const cartStore = db.createObjectStore('cart', { keyPath: 'id' });
                    cartStore.createIndex('productId', 'productId', { unique: false });
                }
            };
        });
    }

    async addToCart(product) {
        // 优先使用IndexedDB，失败时使用localStorage
        try {
            if (this.db) {
                const transaction = this.db.transaction(['cart'], 'readwrite');
                const store = transaction.objectStore('cart');

                // 检查商品是否已存在
                const request = store.index('productId').get(product.id);

                request.onsuccess = () => {
                    if (request.result) {
                        // 更新数量
                        const item = request.result;
                        item.quantity += 1;
                        item.updatedAt = new Date().toISOString();
                        store.put(item);
                    } else {
                        // 添加新商品
                        const cartItem = {
                            id: 'cart_' + Date.now() + '_' + product.id,
                            productId: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.image,
                            category: product.category,
                            quantity: 1,
                            addedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        store.add(cartItem);
                    }
                };
            }
        } catch (error) {
            console.log('使用IndexedDB失败，回退到localStorage');
        }

        // 同时更新localStorage作为备份
        const cart = JSON.parse(localStorage.getItem('wuwumall_cart') || '[]');
        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.updatedAt = new Date().toISOString();
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                category: product.category,
                quantity: 1,
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        localStorage.setItem('wuwumall_cart', JSON.stringify(cart));
    }

    async getCart() {
        try {
            if (this.db) {
                return new Promise((resolve) => {
                    const transaction = this.db.transaction(['cart'], 'readonly');
                    const store = transaction.objectStore('cart');
                    const request = store.getAll();

                    request.onsuccess = () => {
                        resolve(request.result);
                    };

                    request.onerror = () => {
                        // 失败时使用localStorage
                        const cart = JSON.parse(localStorage.getItem('wuwumall_cart') || '[]');
                        resolve(cart);
                    };
                });
            }
        } catch (error) {
            console.log('使用IndexedDB获取购物车失败，使用localStorage');
        }

        return JSON.parse(localStorage.getItem('wuwumall_cart') || '[]');
    }
}

// 创建全局数据库实例
let dbInstance = null;

async function getDB() {
    if (!dbInstance) {
        dbInstance = new WuwuMallDB();
        await dbInstance.init();
    }
    return dbInstance;
}

// 应用初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('WUWUMALL应用已加载');

    // 初始化数据库
    getDB().then(db => {
        console.log('数据库初始化完成');
    }).catch(error => {
        console.error('数据库初始化失败:', error);
    });
});

// 全局函数
window.getDB = getDB;