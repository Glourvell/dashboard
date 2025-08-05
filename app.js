// Sales Dashboard Application - Pure JavaScript Implementation

class SalesDashboard {
    constructor() {
        this.currentUser = null;
        this.users = this.initializeUsers();
        this.sales = this.loadSales();
        this.charts = {};
        this.currentPaymentStatus = false; // false = unpaid, true = paid
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    // Authentication Management
    initializeUsers() {
        const existingUsers = localStorage.getItem('dashboard_users');
        if (!existingUsers) {
            const defaultUsers = [
                {
                    id: 'admin-1',
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'user-1',
                    username: 'user',
                    password: 'user123',
                    role: 'user',
                    createdAt: new Date().toISOString(),
                }
            ];
            localStorage.setItem('dashboard_users', JSON.stringify(defaultUsers));
            return defaultUsers;
        }
        return JSON.parse(existingUsers);
    }

    checkAuthState() {
        const authData = localStorage.getItem('dashboard_auth');
        if (authData) {
            const { user } = JSON.parse(authData);
            this.currentUser = user;
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = user;
            const authState = { user, isAuthenticated: true };
            localStorage.setItem('dashboard_auth', JSON.stringify(authState));
            this.showToast('Success', 'Logged in successfully!', 'success');
            this.showDashboard();
            return true;
        }
        this.showToast('Error', 'Invalid username or password', 'error');
        return false;
    }

    register(username, password, role) {
        if (this.users.some(u => u.username === username)) {
            this.showToast('Error', 'Username already exists', 'error');
            return false;
        }

        const newUser = {
            id: `user-${Date.now()}`,
            username,
            password,
            role,
            createdAt: new Date().toISOString(),
        };

        this.users.push(newUser);
        localStorage.setItem('dashboard_users', JSON.stringify(this.users));

        this.currentUser = newUser;
        const authState = { user: newUser, isAuthenticated: true };
        localStorage.setItem('dashboard_auth', JSON.stringify(authState));
        
        this.showToast('Success', 'Account created successfully!', 'success');
        this.showDashboard();
        return true;
    }

    logout() {
        localStorage.removeItem('dashboard_auth');
        this.currentUser = null;
        this.destroyCharts();
        this.showLogin();
        this.showToast('Success', 'Logged out successfully!', 'success');
    }

    // Screen Management
    showLogin() {
        this.hideAllScreens();
        document.getElementById('login-screen').classList.add('active');
    }

    showDashboard() {
        if (!this.currentUser) return;
        
        this.hideAllScreens();
        
        if (this.currentUser.role === 'admin') {
            document.getElementById('admin-dashboard').classList.add('active');
            this.loadAdminDashboard();
        } else {
            document.getElementById('user-dashboard').classList.add('active');
            this.loadUserDashboard();
        }
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }

    // Sales Data Management
    loadSales() {
        return JSON.parse(localStorage.getItem('dashboard_sales') || '[]');
    }

    saveSales() {
        localStorage.setItem('dashboard_sales', JSON.stringify(this.sales));
    }

    addSale(saleData) {
        const newSale = {
            id: `sale-${Date.now()}`,
            ...saleData,
            timestamp: new Date().toISOString(),
        };
        
        this.sales.push(newSale);
        this.saveSales();
        return newSale;
    }

    updatePaymentStatus(saleId, isPaid) {
        const saleIndex = this.sales.findIndex(sale => sale.id === saleId);
        if (saleIndex !== -1) {
            this.sales[saleIndex].isPaid = isPaid;
            this.saveSales();
            return true;
        }
        return false;
    }

    getSalesByUser(userId) {
        return this.sales.filter(sale => sale.userId === userId);
    }

    getPaymentStats(userId = null) {
        const salesData = userId ? this.getSalesByUser(userId) : this.sales;
        
        const paidSales = salesData.filter(sale => sale.isPaid);
        const unpaidSales = salesData.filter(sale => !sale.isPaid);
        
        return {
            totalPaid: paidSales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0),
            totalUnpaid: unpaidSales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0),
            salesCount: paidSales.length,
            unpaidCount: unpaidSales.length,
        };
    }

    getItemPopularity() {
        const itemStats = {};
        
        this.sales.forEach(sale => {
            if (!itemStats[sale.item]) {
                itemStats[sale.item] = { count: 0, totalValue: 0 };
            }
            itemStats[sale.item].count += sale.quantity;
            itemStats[sale.item].totalValue += sale.price * sale.quantity;
        });
        
        return Object.entries(itemStats)
            .map(([item, stats]) => ({ item, ...stats }))
            .sort((a, b) => b.count - a.count);
    }

    // Dashboard Loading
    loadUserDashboard() {
        document.getElementById('user-welcome').textContent = `Welcome, ${this.currentUser.username}`;
        
        const userSales = this.getSalesByUser(this.currentUser.id);
        const stats = this.getPaymentStats(this.currentUser.id);
        
        this.updateUserStats(stats);
        this.renderUserSalesList(userSales);
        this.createUserSalesChart(userSales);
    }

    loadAdminDashboard() {
        const stats = this.getPaymentStats();
        const totalRevenue = stats.totalPaid + stats.totalUnpaid;
        
        this.updateAdminStats(stats, totalRevenue);
        this.renderAdminSalesList(this.sales);
        this.createAdminCharts(this.sales);
    }

    updateUserStats(stats) {
        document.getElementById('user-total-paid').textContent = `Ksh:${stats.totalPaid.toFixed(2)}`;
        document.getElementById('user-sales-count').textContent = stats.salesCount;
        document.getElementById('user-total-unpaid').textContent = `Ksh:${stats.totalUnpaid.toFixed(2)}`;
        document.getElementById('user-unpaid-count').textContent = stats.unpaidCount;
    }

    updateAdminStats(stats, totalRevenue) {
        document.getElementById('admin-total-revenue').textContent = `Ksh:${totalRevenue.toFixed(2)}`;
        document.getElementById('admin-total-paid').textContent = `Ksh:${stats.totalPaid.toFixed(2)}`;
        document.getElementById('admin-sales-count').textContent = stats.salesCount;
        document.getElementById('admin-total-unpaid').textContent = `Ksh:${stats.totalUnpaid.toFixed(2)}`;
        document.getElementById('admin-unpaid-count').textContent = stats.unpaidCount;
        document.getElementById('admin-total-sales').textContent = this.sales.length;
    }

    // Sales List Rendering
    renderUserSalesList(sales) {
        const container = document.getElementById('user-sales-list');
        this.renderSalesList(container, sales, false);
    }

    renderAdminSalesList(sales) {
        const container = document.getElementById('admin-sales-list');
        this.renderSalesList(container, sales, true);
    }

    renderSalesList(container, sales, showUser) {
        if (sales.length === 0) {
            container.innerHTML = '<p class="empty-state">No sales recorded yet</p>';
            return;
        }

        const sortedSales = [...sales].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        container.innerHTML = sortedSales.map(sale => `
            <div class="sale-item">
                <div class="sale-main">
                    <div class="sale-info">
                        <div class="sale-title">
                            <strong>${sale.name}</strong>
                            <span class="badge badge-secondary">${sale.item}</span>
                            ${showUser ? `<span class="badge badge-outline">${sale.username}</span>` : ''}
                        </div>
                        <div class="sale-details">
                            Qty: ${sale.quantity} • Price: Ksh:${sale.price.toFixed(2)} • 
                            Total: Ksh:${(sale.quantity * sale.price).toFixed(2)}
                        </div>
                        <div class="sale-timestamp">
                            ${this.formatDate(sale.timestamp)}
                        </div>
                    </div>
                    <div class="sale-actions">
                        <span class="badge ${sale.isPaid ? 'badge-success' : 'badge-danger'}">
                            ${sale.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                        <button class="btn ${sale.isPaid ? 'btn-outline' : 'btn-success'}" 
                                onclick="dashboard.togglePaymentStatus('${sale.id}', ${!sale.isPaid})">
                            <i class="fas fa-${sale.isPaid ? 'times' : 'check'}"></i>
                            ${sale.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    togglePaymentStatus(saleId, isPaid) {
        if (this.updatePaymentStatus(saleId, isPaid)) {
            this.showToast('Success', `Payment status updated to ${isPaid ? 'paid' : 'unpaid'}`, 'success');
            
            // Refresh the appropriate dashboard
            if (this.currentUser.role === 'admin') {
                this.loadAdminDashboard();
            } else {
                this.loadUserDashboard();
            }
        } else {
            this.showToast('Error', 'Failed to update payment status', 'error');
        }
    }

    // Chart Creation
    createUserSalesChart(sales) {
        const canvas = document.getElementById('user-sales-chart');
        const ctx = canvas.getContext('2d');
        
        if (this.charts.userSales) {
            this.charts.userSales.destroy();
        }

        const salesByDate = this.groupSalesByDate(sales);
        const labels = Object.keys(salesByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const paidData = labels.map(date => salesByDate[date].paid);
        const unpaidData = labels.map(date => salesByDate[date].unpaid);

        this.charts.userSales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(date => new Date(date).toLocaleDateString()),
                datasets: [
                    {
                        label: 'Paid',
                        data: paidData,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.1,
                        fill: true,
                    },
                    {
                        label: 'Unpaid',
                        data: unpaidData,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.1,
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    },
                },
            },
        });
    }

    createAdminCharts(sales) {
        this.createPaymentDistributionChart(sales);
        this.createDebtChart(sales);
        this.createItemsChart(sales);
    }

    createPaymentDistributionChart(sales) {
        const canvas = document.getElementById('admin-payment-chart');
        const ctx = canvas.getContext('2d');
        
        if (this.charts.paymentDistribution) {
            this.charts.paymentDistribution.destroy();
        }

        const users = this.users.filter(u => u.role === 'user');
        const userPayments = users.map(user => {
            const userSales = sales.filter(s => s.userId === user.id && s.isPaid);
            const total = userSales.reduce((sum, sale) => sum + (sale.quantity * sale.price), 0);
            return { user: user.username, total, sales: userSales };
        });

        this.charts.paymentDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: userPayments.map(up => up.user),
                datasets: [{
                    data: userPayments.map(up => up.total),
                    backgroundColor: [
                        'rgb(16, 185, 129)',
                        'rgb(59, 130, 246)',
                        'rgb(168, 85, 247)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)',
                    ],
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        this.showChartModal({
                            type: 'payment',
                            user: userPayments[index].user,
                            amount: userPayments[index].total,
                            sales: userPayments[index].sales,
                        });
                    }
                },
            },
        });
    }

    createDebtChart(sales) {
        const canvas = document.getElementById('admin-debt-chart');
        const ctx = canvas.getContext('2d');
        
        if (this.charts.debt) {
            this.charts.debt.destroy();
        }

        const users = this.users.filter(u => u.role === 'user');
        const userDebts = users.map(user => {
            const userSales = sales.filter(s => s.userId === user.id && !s.isPaid);
            const total = userSales.reduce((sum, sale) => sum + (sale.quantity * sale.price), 0);
            return { user: user.username, total, sales: userSales };
        }).filter(ud => ud.total > 0);

        this.charts.debt = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: userDebts.map(ud => ud.user),
                datasets: [{
                    label: 'Outstanding Debt',
                    data: userDebts.map(ud => ud.total),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        this.showChartModal({
                            type: 'debt',
                            user: userDebts[index].user,
                            amount: userDebts[index].total,
                            sales: userDebts[index].sales,
                        });
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    },
                },
            },
        });
    }

    createItemsChart(sales) {
        const canvas = document.getElementById('admin-items-chart');
        const ctx = canvas.getContext('2d');
        
        if (this.charts.items) {
            this.charts.items.destroy();
        }

        const itemStats = sales.reduce((acc, sale) => {
            if (!acc[sale.item]) {
                acc[sale.item] = 0;
            }
            acc[sale.item] += sale.quantity;
            return acc;
        }, {});

        const sortedItems = Object.entries(itemStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        this.charts.items = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedItems.map(([item]) => item),
                datasets: [{
                    label: 'Quantity Sold',
                    data: sortedItems.map(([, count]) => count),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    groupSalesByDate(sales) {
        return sales.reduce((acc, sale) => {
            const date = new Date(sale.timestamp).toDateString();
            if (!acc[date]) {
                acc[date] = { paid: 0, unpaid: 0 };
            }
            const amount = sale.quantity * sale.price;
            if (sale.isPaid) {
                acc[date].paid += amount;
            } else {
                acc[date].unpaid += amount;
            }
            return acc;
        }, {});
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    // Modal Management
    showChartModal(data) {
        const modal = document.getElementById('chart-modal');
        const title = document.getElementById('modal-title');
        const amount = document.getElementById('modal-amount');
        const salesList = document.getElementById('modal-sales-list');

        title.textContent = `${data.type === 'payment' ? 'Payment' : 'Debt'} Details - ${data.user}`;
        amount.textContent = `$${data.amount.toFixed(2)}`;
        amount.className = `modal-amount ${data.type === 'payment' ? 'positive' : 'negative'}`;

        salesList.innerHTML = data.sales.map(sale => `
            <div class="modal-sale-item">
                <div class="modal-sale-left">
                    <p><strong>${sale.name}</strong></p>
                    <p class="sale-details">${sale.item}</p>
                    <p class="sale-timestamp">${this.formatDate(sale.timestamp)}</p>
                </div>
                <div class="modal-sale-right">
                    <p><strong>Ksh:${(sale.quantity * sale.price).toFixed(2)}</strong></p>
                    <p class="sale-details">Qty: ${sale.quantity}</p>
                </div>
            </div>
        `).join('');

        modal.classList.add('active');
    }

    hideChartModal() {
        document.getElementById('chart-modal').classList.remove('active');
    }

    // Event Listeners
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            this.login(username, password);
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            const role = document.getElementById('register-role').value;
            this.register(username, password, role);
        });

        // Logout buttons
        document.getElementById('user-logout').addEventListener('click', () => this.logout());
        document.getElementById('admin-logout').addEventListener('click', () => this.logout());

        // Add item form
        document.getElementById('add-item-btn').addEventListener('click', () => {
            document.getElementById('add-item-form').classList.remove('hidden');
            document.getElementById('add-item-btn').classList.add('hidden');
        });

        document.getElementById('close-form-btn').addEventListener('click', () => {
            document.getElementById('add-item-form').classList.add('hidden');
            document.getElementById('add-item-btn').classList.remove('hidden');
        });

        // Payment status buttons
        document.getElementById('paid-btn').addEventListener('click', () => {
            this.currentPaymentStatus = true;
            document.getElementById('paid-btn').classList.add('btn-primary');
            document.getElementById('paid-btn').classList.remove('btn-outline');
            document.getElementById('unpaid-btn').classList.add('btn-outline');
            document.getElementById('unpaid-btn').classList.remove('btn-primary');
        });

        document.getElementById('unpaid-btn').addEventListener('click', () => {
            this.currentPaymentStatus = false;
            document.getElementById('unpaid-btn').classList.add('btn-primary');
            document.getElementById('unpaid-btn').classList.remove('btn-outline');
            document.getElementById('paid-btn').classList.add('btn-outline');
            document.getElementById('paid-btn').classList.remove('btn-primary');
        });

        // Item form submission
        document.getElementById('item-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddItem(e);
        });

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => this.hideChartModal());
        document.getElementById('chart-modal').addEventListener('click', (e) => {
            if (e.target.id === 'chart-modal') {
                this.hideChartModal();
            }
        });
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');
    }

    handleAddItem(e) {
        const formData = new FormData(e.target);
        const name = document.getElementById('item-name').value;
        const item = document.getElementById('item-type').value;
        const quantity = parseInt(document.getElementById('item-quantity').value);
        const price = parseFloat(document.getElementById('item-price').value);

        if (!name || !item || quantity < 1 || price < 0) {
            this.showToast('Error', 'Please fill all fields correctly', 'error');
            return;
        }

        const saleData = {
            name,
            item,
            quantity,
            price,
            isPaid: this.currentPaymentStatus,
            userId: this.currentUser.id,
            username: this.currentUser.username,
        };

        try {
            this.addSale(saleData);
            this.showToast('Success', 'Item added successfully!', 'success');
            
            // Reset form
            document.getElementById('item-form').reset();
            document.getElementById('item-quantity').value = 1;
            document.getElementById('item-price').value = '';
            this.currentPaymentStatus = false;
            document.getElementById('unpaid-btn').click();
            
            // Hide form
            document.getElementById('add-item-form').classList.add('hidden');
            document.getElementById('add-item-btn').classList.remove('hidden');
            
            // Refresh dashboard
            this.loadUserDashboard();
        } catch (error) {
            this.showToast('Error', 'Failed to add item', 'error');
        }
    }

    // Utility Functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showToast(title, message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Initialize the dashboard when the page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new SalesDashboard();
});