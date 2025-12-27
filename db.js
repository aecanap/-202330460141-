// 增强版数据库管理
class WuwuMallDB {
    constructor() {
        this.db = null;
        this.dbName = 'WuwuMallDB';
        this.dbVersion = 2; // 增加版本号
        this.isIndexedDBAvailable = 'indexedDB' in window;
    }

    async init() {
        if (!this.isIndexedDBAvailable) {
            console.log('IndexedDB不可用，使用LocalStorage');
            return this.initLocalStorage();
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('IndexedDB打开失败:', event.target.error);
                this.initLocalStorage();
                resolve(this);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB连接成功');
                resolve(this);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('数据库升级，版本:', event.oldVersion, '→', event.newVersion);

                // 创建用户表
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('phone', 'phone', { unique: true });
                    userStore.createIndex('email', 'email', { unique: false });
                    userStore.createIndex('username', 'username', { unique: true });
                    console.log('创建users表');
                }

                // 创建商品表
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                    console.log('创建products表');
                }

                // 创建购物车表
                if (!db.objectStoreNames.contains('cart')) {
                    const cartStore = db.createObjectStore('cart', { keyPath: 'id' });
                    cartStore.createIndex('productId', 'productId', { unique: false });
                    cartStore.createIndex('userId', 'userId', { unique: false });
                    console.log('创建cart表');
                }

                // 创建订单表
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
                    orderStore.createIndex('userId', 'userId', { unique: false });
                    orderStore.createIndex('status', 'status', { unique: false });
                    orderStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('创建orders表');
                }
            };
        });
    }

    initLocalStorage() {
        console.log('初始化LocalStorage');
        this.storageMode = 'localStorage';

        // 初始化默认数据结构
        if (!localStorage.getItem('wuwumall_users')) {
            localStorage.setItem('wuwumall_users', JSON.stringify([]));
        }

        if (!localStorage.getItem('wuwumall_products')) {
            localStorage.setItem('wuwumall_products', JSON.stringify([]));
        }

        if (!localStorage.getItem('wuwumall_cart')) {
            localStorage.setItem('wuwumall_cart', JSON.stringify([]));
        }

        if (!localStorage.getItem('wuwumall_orders')) {
            localStorage.setItem('wuwumall_orders', JSON.stringify([]));
        }

        return this;
    }

    async getAll(storeName) {
        if (this.storageMode === 'localStorage') {
            const data = localStorage.getItem(`wuwumall_${storeName}`) || '[]';
            return JSON.parse(data);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async query(storeName, indexName, value) {
        if (this.storageMode === 'localStorage') {
            const allData = JSON.parse(localStorage.getItem(`wuwumall_${storeName}`) || '[]');
            return allData.filter(item => item[indexName] === value);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        if (this.storageMode === 'localStorage') {
            const allData = JSON.parse(localStorage.getItem(`wuwumall_${storeName}`) || '[]');
            return allData.find(item => item.id === key);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, data) {
        if (this.storageMode === 'localStorage') {
            const allData = JSON.parse(localStorage.getItem(`wuwumall_${storeName}`) || '[]');
            allData.push(data);
            localStorage.setItem(`wuwumall_${storeName}`, JSON.stringify(allData));
            return data.id;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        if (this.storageMode === 'localStorage') {
            const allData = JSON.parse(localStorage.getItem(`wuwumall_${storeName}`) || '[]');
            const index = allData.findIndex(item => item.id === data.id);

            if (index !== -1) {
                allData[index] = data;
            } else {
                allData.push(data);
            }

            localStorage.setItem(`wuwumall_${storeName}`, JSON.stringify(allData));
            return data.id;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        if (this.storageMode === 'localStorage') {
            const allData = JSON.parse(localStorage.getItem(`wuwumall_${storeName}`) || '[]');
            const filteredData = allData.filter(item => item.id !== key);
            localStorage.setItem(`wuwumall_${storeName}`, JSON.stringify(filteredData));
            return true;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // 清空表
    async clear(storeName) {
        if (this.storageMode === 'localStorage') {
            localStorage.setItem(`wuwumall_${storeName}`, JSON.stringify([]));
            return true;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // 批量操作
    async bulkAdd(storeName, items) {
        if (this.storageMode === 'localStorage') {
            const allData = JSON.parse(localStorage.getItem(`wuwumall_${storeName}`) || '[]');
            allData.push(...items);
            localStorage.setItem(`wuwumall_${storeName}`, JSON.stringify(allData));
            return items.map(item => item.id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const results = [];

            items.forEach(item => {
                const request = store.add(item);
                request.onsuccess = () => results.push(request.result);
            });

            transaction.oncomplete = () => resolve(results);
            transaction.onerror = () => reject(transaction.error);
        });
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