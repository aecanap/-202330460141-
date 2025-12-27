/**
 * WUWUMALL 用户认证管理模块
 * 负责用户注册、登录、退出、会话管理和权限验证
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24小时会话超时
        this.init();
    }

    /**
     * 初始化认证模块
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // 从sessionStorage恢复登录状态
            const userData = sessionStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);

                // 检查会话是否过期
                const lastActivity = sessionStorage.getItem('lastActivity');
                if (lastActivity) {
                    const timeDiff = Date.now() - parseInt(lastActivity);
                    if (timeDiff > this.sessionTimeout) {
                        // 会话过期，自动退出
                        await this.logout();
                        console.log('会话已过期，请重新登录');
                    } else {
                        // 更新活动时间
                        this.updateActivityTime();
                    }
                }
            }

            // 从localStorage加载记住的账号
            const remembered = localStorage.getItem('rememberedAccount');
            if (remembered) {
                this.rememberedAccount = JSON.parse(remembered);
            }

            this.isInitialized = true;
            console.log('认证模块初始化完成');

            // 设置会话心跳
            this.startSessionHeartbeat();

        } catch (error) {
            console.error('认证模块初始化失败:', error);
        }
    }

    /**
     * 用户注册
     * @param {Object} userData - 用户数据
     * @returns {Promise<Object>} 注册结果
     */
    async register(userData) {
        try {
            // 验证必填字段
            if (!userData.phone || !userData.username || !userData.password) {
                throw new Error('请填写完整信息');
            }

            // 验证手机号格式
            if (!/^1[3-9]\d{9}$/.test(userData.phone)) {
                throw new Error('请输入正确的手机号');
            }

            // 验证用户名格式
            if (userData.username.length < 3 || userData.username.length > 20) {
                throw new Error('用户名长度应为3-20位');
            }

            // 验证密码强度
            if (userData.password.length < 6 || userData.password.length > 20) {
                throw new Error('密码长度应为6-20位');
            }

            // 如果提供了邮箱，验证格式
            if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
                throw new Error('邮箱格式不正确');
            }

            const db = await getDB();

            // 检查手机号是否已注册
            const existingByPhone = await db.query('users', 'phone', userData.phone);
            if (existingByPhone.length > 0) {
                throw new Error('该手机号已注册');
            }

            // 检查用户名是否已存在
            const existingByUsername = await db.query('users', 'username', userData.username);
            if (existingByUsername.length > 0) {
                throw new Error('用户名已存在');
            }

            // 如果提供了邮箱，检查邮箱是否已注册
            if (userData.email) {
                const existingByEmail = await db.query('users', 'email', userData.email);
                if (existingByEmail.length > 0) {
                    throw new Error('邮箱已注册');
                }
            }

            // 创建用户对象
            const newUser = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                username: userData.username,
                phone: userData.phone,
                email: userData.email || null,
                password: this.encryptPassword(userData.password),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLogin: null,
                status: 'active',
                points: 100, // 新用户赠送100积分
                vipLevel: 1,
                avatar: null,
                preferences: {
                    theme: 'light',
                    language: 'zh-CN',
                    notifications: true
                }
            };

            // 保存用户数据
            await db.add('users', newUser);

            // 创建默认地址
            const defaultAddress = {
                id: `addr_${Date.now()}`,
                userId: newUser.id,
                name: '默认地址',
                recipient: userData.username,
                phone: userData.phone,
                province: '请选择',
                city: '请选择',
                district: '请选择',
                detail: '请填写详细地址',
                isDefault: true,
                createdAt: new Date().toISOString()
            };

            await db.add('addresses', defaultAddress);

            // 记录注册日志
            this.logUserActivity(newUser.id, 'register', {
                ip: this.getClientIP(),
                userAgent: navigator.userAgent
            });

            // 自动登录
            const loginResult = await this.login({
                account: userData.phone,
                password: userData.password,
                remember: true
            });

            return {
                success: true,
                message: '注册成功！赠送100积分',
                user: loginResult.user
            };

        } catch (error) {
            console.error('注册失败:', error);
            return {
                success: false,
                message: error.message || '注册失败，请稍后重试'
            };
        }
    }

    /**
     * 用户登录
     * @param {Object} credentials - 登录凭据
     * @returns {Promise<Object>} 登录结果
     */
    async login(credentials) {
        try {
            const { account, password, remember = false } = credentials;

            if (!account || !password) {
                throw new Error('请输入账号和密码');
            }

            const db = await getDB();
            const users = await db.getAll('users');

            // 查找匹配的用户
            let foundUser = null;
            for (const user of users) {
                // 匹配手机号、邮箱或用户名
                if (user.phone === account ||
                    user.email === account ||
                    user.username === account) {
                    foundUser = user;
                    break;
                }
            }

            if (!foundUser) {
                throw new Error('账号不存在');
            }

            // 检查用户状态
            if (foundUser.status === 'suspended') {
                throw new Error('账号已被禁用，请联系客服');
            }

            if (foundUser.status === 'inactive') {
                throw new Error('账号未激活，请检查邮箱');
            }

            // 验证密码
            const encryptedPassword = this.encryptPassword(password);
            if (foundUser.password !== encryptedPassword) {
                // 密码错误，记录尝试
                this.recordLoginAttempt(foundUser.id, false);

                // 检查是否锁定账号
                const attempts = this.getLoginAttempts(foundUser.id);
                if (attempts >= 5) {
                    await this.lockAccount(foundUser.id);
                    throw new Error('密码错误次数过多，账号已锁定');
                }

                throw new Error('密码错误');
            }

            // 登录成功，清除错误尝试记录
            this.clearLoginAttempts(foundUser.id);

            // 更新用户最后登录时间
            foundUser.lastLogin = new Date().toISOString();
            await db.update('users', foundUser);

            // 设置当前用户
            this.currentUser = {
                id: foundUser.id,
                username: foundUser.username,
                phone: foundUser.phone,
                email: foundUser.email,
                points: foundUser.points,
                vipLevel: foundUser.vipLevel,
                avatar: foundUser.avatar,
                preferences: foundUser.preferences,
                lastLogin: foundUser.lastLogin
            };

            // 保存到sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.updateActivityTime();

            // 记住账号
            if (remember) {
                localStorage.setItem('rememberedAccount', JSON.stringify({
                    account: account,
                    rememberTime: new Date().toISOString()
                }));
            }

            // 记录登录日志
            this.logUserActivity(foundUser.id, 'login', {
                ip: this.getClientIP(),
                userAgent: navigator.userAgent,
                location: '未知位置'
            });

            // 触发登录事件
            this.triggerEvent('login', this.currentUser);

            return {
                success: true,
                message: '登录成功',
                user: this.currentUser
            };

        } catch (error) {
            console.error('登录失败:', error);
            return {
                success: false,
                message: error.message || '登录失败，请稍后重试'
            };
        }
    }

    /**
     * 用户退出
     */
    async logout() {
        try {
            if (this.currentUser) {
                // 记录退出日志
                this.logUserActivity(this.currentUser.id, 'logout', {
                    ip: this.getClientIP(),
                    userAgent: navigator.userAgent
                });

                // 触发退出事件
                this.triggerEvent('logout', this.currentUser);
            }

            // 清除会话数据
            this.currentUser = null;
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('lastActivity');

            // 不删除记住的账号，但可设置过期
            const remembered = localStorage.getItem('rememberedAccount');
            if (remembered) {
                const data = JSON.parse(remembered);
                const rememberTime = new Date(data.rememberTime);
                const now = new Date();
                const daysDiff = (now - rememberTime) / (1000 * 60 * 60 * 24);

                if (daysDiff > 30) {
                    // 30天后自动清除记住的账号
                    localStorage.removeItem('rememberedAccount');
                }
            }

            // 停止会话心跳
            this.stopSessionHeartbeat();

            console.log('用户已退出');

        } catch (error) {
            console.error('退出失败:', error);
        }
    }

    /**
     * 检查用户是否已登录
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * 获取当前登录用户
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 获取记住的账号
     * @returns {Object|null}
     */
    getRememberedAccount() {
        return this.rememberedAccount;
    }

    /**
     * 密码加密
     * @param {string} password - 原始密码
     * @returns {string} 加密后的密码
     */
    encryptPassword(password) {
        // 简单加密，实际项目中应使用更安全的加密方式
        return btoa(unescape(encodeURIComponent(password))) + '_wuwumall_2025';
    }

    /**
     * 更新用户资料
     * @param {Object} updates - 更新数据
     * @returns {Promise<Object>}
     */
    async updateProfile(updates) {
        try {
            if (!this.isLoggedIn()) {
                throw new Error('请先登录');
            }

            const db = await getDB();
            const user = await db.get('users', this.currentUser.id);

            if (!user) {
                throw new Error('用户不存在');
            }

            // 更新允许修改的字段
            const allowedFields = ['username', 'email', 'avatar', 'preferences'];
            let hasChanges = false;

            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    user[field] = updates[field];
                    hasChanges = true;
                }
            }

            if (!hasChanges) {
                throw new Error('没有需要更新的信息');
            }

            user.updatedAt = new Date().toISOString();
            await db.update('users', user);

            // 更新当前用户信息
            this.currentUser.username = user.username;
            this.currentUser.email = user.email;
            this.currentUser.avatar = user.avatar;
            this.currentUser.preferences = user.preferences;

            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            return {
                success: true,
                message: '资料更新成功',
                user: this.currentUser
            };

        } catch (error) {
            console.error('更新资料失败:', error);
            return {
                success: false,
                message: error.message || '更新失败'
            };
        }
    }

    /**
     * 重置密码
     * @param {Object} data - 重置数据
     * @returns {Promise<Object>}
     */
    async resetPassword(data) {
        try {
            const { account, newPassword } = data;

            if (!account || !newPassword) {
                throw new Error('请输入完整信息');
            }

            if (newPassword.length < 6 || newPassword.length > 20) {
                throw new Error('密码长度应为6-20位');
            }

            const db = await getDB();
            const users = await db.getAll('users');

            // 查找用户
            let foundUser = null;
            for (const user of users) {
                if (user.phone === account || user.email === account) {
                    foundUser = user;
                    break;
                }
            }

            if (!foundUser) {
                throw new Error('账号不存在');
            }

            // 更新密码
            foundUser.password = this.encryptPassword(newPassword);
            foundUser.updatedAt = new Date().toISOString();
            await db.update('users', foundUser);

            // 记录密码重置日志
            this.logUserActivity(foundUser.id, 'reset_password', {
                ip: this.getClientIP(),
                userAgent: navigator.userAgent
            });

            return {
                success: true,
                message: '密码重置成功'
            };

        } catch (error) {
            console.error('重置密码失败:', error);
            return {
                success: false,
                message: error.message || '重置失败'
            };
        }
    }

    /**
     * 页面访问权限检查
     * @param {string} page - 页面名称
     * @param {Function} redirectFn - 重定向函数
     */
    async requireAuth(page = 'customer', redirectFn = null) {
        if (!this.isLoggedIn()) {
            // 记录访问尝试
            console.log(`未登录用户尝试访问 ${page} 页面`);

            // 如果提供了重定向函数，则执行
            if (redirectFn && typeof redirectFn === 'function') {
                redirectFn();
            } else {
                // 默认重定向到登录页
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            }
            return false;
        }

        // 检查用户权限
        const hasPermission = await this.checkPermission(page);
        if (!hasPermission) {
            alert('您没有权限访问此页面');
            window.location.href = 'index.html';
            return false;
        }

        return true;
    }

    /**
     * 检查操作权限
     * @param {string} action - 操作名称
     * @returns {boolean}
     */
    async checkPermission(action) {
        if (!this.isLoggedIn()) return false;

        const user = this.currentUser;

        // 基础权限检查
        switch (action) {
            case 'view_products':
            case 'add_to_cart':
            case 'place_order':
                // 所有登录用户都有这些权限
                return true;

            case 'manage_products':
            case 'view_all_orders':
                // 仅商家有这些权限
                return user.role === 'seller' || user.vipLevel >= 3;

            case 'manage_users':
                // 仅管理员有这些权限
                return user.role === 'admin';

            default:
                return true;
        }
    }

    /**
     * 获取用户角色
     * @returns {string}
     */
    getUserRole() {
        return this.currentUser?.role || 'customer';
    }

    /**
     * 检查用户是否为VIP
     * @returns {boolean}
     */
    isVIP() {
        return this.currentUser?.vipLevel >= 2;
    }

    /**
     * 记录用户活动
     * @param {string} userId - 用户ID
     * @param {string} action - 活动类型
     * @param {Object} metadata - 附加数据
     */
    async logUserActivity(userId, action, metadata = {}) {
        try {
            const activity = {
                id: `activity_${Date.now()}`,
                userId: userId,
                action: action,
                timestamp: new Date().toISOString(),
                ip: metadata.ip || '未知',
                userAgent: metadata.userAgent || '未知',
                ...metadata
            };

            // 保存活动日志到localStorage（简化版）
            const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
            activities.push(activity);
            localStorage.setItem('user_activities', JSON.stringify(activities.slice(-1000))); // 只保留最近1000条

            console.log(`记录用户活动: ${action}`, activity);

        } catch (error) {
            console.error('记录用户活动失败:', error);
        }
    }

    /**
     * 更新活动时间
     */
    updateActivityTime() {
        sessionStorage.setItem('lastActivity', Date.now().toString());
    }

    /**
     * 记录登录尝试
     * @param {string} userId - 用户ID
     * @param {boolean} success - 是否成功
     */
    recordLoginAttempt(userId, success) {
        const attemptsKey = `login_attempts_${userId}`;
        const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');

        attempts.push({
            timestamp: new Date().toISOString(),
            success: success,
            ip: this.getClientIP()
        });

        localStorage.setItem(attemptsKey, JSON.stringify(attempts.slice(-10))); // 只保留最近10次尝试
    }

    /**
     * 获取登录尝试次数
     * @param {string} userId - 用户ID
     * @returns {number}
     */
    getLoginAttempts(userId) {
        const attemptsKey = `login_attempts_${userId}`;
        const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');

        // 统计最近30分钟的失败尝试
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        const recentFailures = attempts.filter(attempt =>
            !attempt.success && new Date(attempt.timestamp) >= thirtyMinutesAgo
        );

        return recentFailures.length;
    }

    /**
     * 清除登录尝试记录
     * @param {string} userId - 用户ID
     */
    clearLoginAttempts(userId) {
        const attemptsKey = `login_attempts_${userId}`;
        localStorage.removeItem(attemptsKey);
    }

    /**
     * 锁定账号
     * @param {string} userId - 用户ID
     */
    async lockAccount(userId) {
        try {
            const db = await getDB();
            const user = await db.get('users', userId);

            if (user) {
                user.status = 'suspended';
                user.updatedAt = new Date().toISOString();
                await db.update('users', user);

                console.log(`账号 ${userId} 已被锁定`);
            }
        } catch (error) {
            console.error('锁定账号失败:', error);
        }
    }

    /**
     * 获取客户端IP（简化版）
     * @returns {string}
     */
    getClientIP() {
        // 在实际项目中，应该从服务器获取真实IP
        return '127.0.0.1';
    }

    /**
     * 开始会话心跳
     */
    startSessionHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isLoggedIn()) {
                this.updateActivityTime();
            }
        }, 5 * 60 * 1000); // 每5分钟更新一次
    }

    /**
     * 停止会话心跳
     */
    stopSessionHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * 触发事件
     * @param {string} eventName - 事件名称
     * @param {any} data - 事件数据
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(`auth:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * 监听事件
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    on(eventName, handler) {
        window.addEventListener(`auth:${eventName}`, handler);
    }

    /**
     * 移除事件监听
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    off(eventName, handler) {
        window.removeEventListener(`auth:${eventName}`, handler);
    }

    /**
     * 数据导出
     * @returns {Promise<Object>}
     */
    async exportUserData() {
        if (!this.isLoggedIn()) {
            throw new Error('请先登录');
        }

        try {
            const db = await getDB();

            // 获取用户数据
            const user = await db.get('users', this.currentUser.id);

            // 获取用户相关数据
            const cartItems = await db.query('cart', 'userId', this.currentUser.id);
            const orders = await db.query('orders', 'userId', this.currentUser.id);
            const addresses = await db.query('addresses', 'userId', this.currentUser.id);

            const exportData = {
                user: user,
                cart: cartItems,
                orders: orders,
                addresses: addresses,
                exportTime: new Date().toISOString(),
                version: '1.0'
            };

            return {
                success: true,
                data: exportData
            };

        } catch (error) {
            console.error('导出用户数据失败:', error);
            return {
                success: false,
                message: '导出失败'
            };
        }
    }

    /**
     * 数据导入
     * @param {Object} importData - 导入数据
     * @returns {Promise<Object>}
     */
    async importUserData(importData) {
        if (!this.isLoggedIn()) {
            throw new Error('请先登录');
        }

        try {
            const db = await getDB();

            // 验证导入数据格式
            if (!importData.user || !importData.version) {
                throw new Error('数据格式不正确');
            }

            // 更新用户数据
            const currentUser = await db.get('users', this.currentUser.id);
            const updatedUser = {
                ...currentUser,
                ...importData.user,
                id: this.currentUser.id, // 保持ID不变
                updatedAt: new Date().toISOString()
            };

            await db.update('users', updatedUser);

            // 更新购物车
            if (importData.cart) {
                // 清除现有购物车
                const existingCart = await db.query('cart', 'userId', this.currentUser.id);
                for (const item of existingCart) {
                    await db.delete('cart', [item.userId, item.productId]);
                }

                // 添加导入的购物车数据
                for (const item of importData.cart) {
                    await db.add('cart', {
                        ...item,
                        userId: this.currentUser.id
                    });
                }
            }

            return {
                success: true,
                message: '数据导入成功'
            };

        } catch (error) {
            console.error('导入用户数据失败:', error);
            return {
                success: false,
                message: error.message || '导入失败'
            };
        }
    }
}

// 创建全局认证管理器实例
let authInstance = null;

/**
 * 获取认证管理器实例
 * @returns {Promise<AuthManager>}
 */
async function getAuth() {
    if (!authInstance) {
        authInstance = new AuthManager();
        await authInstance.init();
    }
    return authInstance;
}

/**
 * 简化登录函数
 * @param {string} account - 账号
 * @param {string} password - 密码
 * @param {boolean} remember - 是否记住
 * @returns {Promise<Object>}
 */
async function userLogin(account, password, remember = false) {
    const auth = await getAuth();
    return await auth.login({ account, password, remember });
}

/**
 * 简化注册函数
 * @param {Object} userData - 用户数据
 * @returns {Promise<Object>}
 */
async function userRegister(userData) {
    const auth = await getAuth();
    return await auth.register(userData);
}

/**
 * 简化退出函数
 */
async function userLogout() {
    const auth = await getAuth();
    await auth.logout();
}

/**
 * 检查登录状态
 * @returns {Promise<boolean>}
 */
async function checkLoginStatus() {
    const auth = await getAuth();
    return auth.isLoggedIn();
}

/**
 * 获取当前用户
 * @returns {Promise<Object|null>}
 */
async function getCurrentUser() {
    const auth = await getAuth();
    return auth.getCurrentUser();
}

/**
 * 页面访问权限检查
 * @param {string} page - 页面名称
 * @returns {Promise<boolean>}
 */
async function requireAuth(page = 'customer') {
    const auth = await getAuth();
    return await auth.requireAuth(page);
}

// 全局导出
window.AuthManager = AuthManager;
window.getAuth = getAuth;
window.userLogin = userLogin;
window.userRegister = userRegister;
window.userLogout = userLogout;
window.checkLoginStatus = checkLoginStatus;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;

// 自动初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await getAuth();
    } catch (error) {
        console.error('用户认证模块初始化失败:', error);
    }
});

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
});

// 页面卸载时保存状态
window.addEventListener('beforeunload', function() {
    const auth = authInstance;
    if (auth && auth.isLoggedIn()) {
        auth.updateActivityTime();
    }
});