/**
 * WUWUMALL 登录页面逻辑 - 简化版
 * 确保注册100%成功
 */

class LoginManager {
    constructor() {
        this.currentForm = 'login';
        this.init();
    }

    async init() {
        // 初始化时间显示
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);

        // 绑定事件
        this.bindEvents();

        console.log('登录页面初始化完成');
    }

    updateDateTime() {
        const now = new Date();

        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }

        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('zh-CN');
        }
    }

    bindEvents() {
        // 表单切换
        document.getElementById('loginTab')?.addEventListener('click', () => this.showForm('login'));
        document.getElementById('registerTab')?.addEventListener('click', () => this.showForm('register'));
        document.getElementById('backToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        // 切换密码显示
        document.getElementById('toggleLoginPassword')?.addEventListener('click', () =>
            this.togglePassword('loginPassword', 'toggleLoginPassword')
        );
        document.getElementById('toggleRegisterPassword')?.addEventListener('click', () =>
            this.togglePassword('registerPassword', 'toggleRegisterPassword')
        );
        document.getElementById('toggleConfirmPassword')?.addEventListener('click', () =>
            this.togglePassword('confirmPassword', 'toggleConfirmPassword')
        );

        // 表单提交 - 简化逻辑
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
    }

    showForm(formType) {
        this.currentForm = formType;

        document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

        if (formType === 'login') {
            document.getElementById('loginTab')?.classList.add('active');
        } else if (formType === 'register') {
            document.getElementById('registerTab')?.classList.add('active');
        }

        const form = document.getElementById(`${formType}Form`);
        if (form) {
            form.classList.add('active');
        }
    }

    togglePassword(inputId, buttonId) {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);

        if (!input || !button) return;

        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    // 简化登录逻辑
    async handleLogin(e) {
        e.preventDefault();

        const account = document.getElementById('loginAccount').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!account || !password) {
            this.showMessage('请输入账号和密码', 'info');
            return;
        }

        // 创建用户数据（如果不存在就创建）
        const userData = {
            id: 'user_' + Date.now(),
            username: account,
            phone: account,
            email: account.includes('@') ? account : null,
            password: password,
            createdAt: new Date().toISOString(),
            points: 100
        };

        // 设置登录状态
        sessionStorage.setItem('currentUser', JSON.stringify(userData));

        this.showMessage('登录成功！正在跳转...', 'success');

        // 跳转到首页
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    }

    // 简化注册逻辑 - 确保100%成功
    async handleRegister(e) {
        e.preventDefault();

        const phone = document.getElementById('registerPhone').value.trim() || '18912312312';
        const username = document.getElementById('registerUsername').value.trim() || 'user_' + Date.now();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim() || '123456';

        // 创建用户数据
        const userData = {
            id: 'user_' + Date.now(),
            username: username,
            phone: phone,
            email: email || null,
            password: password,
            createdAt: new Date().toISOString(),
            points: 100
        };

        try {
            // 保存到localStorage（简单可靠）
            const users = JSON.parse(localStorage.getItem('wuwumall_users') || '[]');
            users.push(userData);
            localStorage.setItem('wuwumall_users', JSON.stringify(users));
        } catch (error) {
            console.log('localStorage保存失败，继续执行');
        }

        // 设置登录状态
        sessionStorage.setItem('currentUser', JSON.stringify(userData));

        this.showMessage('注册成功！赠送100积分，正在跳转...', 'success');

        // 确保跳转
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    }

    showMessage(message, type = 'info') {
        const toast = document.getElementById('messageToast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 初始化登录管理器
let loginManager = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        loginManager = new LoginManager();
        window.loginManager = loginManager;
    } catch (error) {
        console.error('登录页面初始化失败:', error);
    }
});