// ==================== DASHBOARD - FIREBASE INTEGRATION ====================

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCyLApPHELtMZlvW3sIaqEHqCTds3jPVHo",
    authDomain: "tevin-villa-system.firebaseapp.com",
    projectId: "tevin-villa-system",
    storageBucket: "tevin-villa-system.firebasestorage.app",
    messagingSenderId: "172735256047",
    appId: "1:172735256047:web:70ec19ad5239d136d2d21a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔥 Dashboard: Firebase initialized');

// Chart instances
let paymentStatusChart = null;
let monthlyChart = null;

// Check if Chart.js is loaded
function isChartJsLoaded() {
    return typeof Chart !== 'undefined';
}

// ==================== LOAD DASHBOARD DATA ====================

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Load tenants and payments
        const [tenantsSnapshot, paymentsSnapshot] = await Promise.all([
            getDocs(collection(db, "tenants")),
            getDocs(collection(db, "payments"))
        ]);
        
        // Process tenants data
        const tenants = [];
        tenantsSnapshot.forEach(doc => {
            tenants.push({ id: doc.id, ...doc.data() });
        });
        
        // Process payments data
        const payments = [];
        paymentsSnapshot.forEach(doc => {
            payments.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📊 Loaded ${tenants.length} tenants and ${payments.length} payments`);
        
        // Update all dashboard sections
        updateMetrics(tenants, payments);
        updateRecentPayments(payments);
        updateRecentTenants(tenants);
        
        // Update charts if Chart.js is loaded
        if (isChartJsLoaded()) {
            updateCharts(tenants, payments);
        } else {
            console.warn('Chart.js not loaded yet, retrying in 1 second...');
            setTimeout(() => updateCharts(tenants, payments), 1000);
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// ==================== UPDATE METRICS ====================

/**
 * Update metric cards
 */
function updateMetrics(tenants, payments) {
    // Tenant metrics
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === 'Active').length;
    const pendingTenants = tenants.filter(t => t.status === 'Pending').length;
    
    // Unit metrics
    const totalUnits = tenants.length;
    const occupiedUnits = tenants.filter(t => t.status === 'Active').length;
    const vacantUnits = totalUnits - occupiedUnits;
    
    // Revenue metrics
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyRevenue = tenants
        .filter(t => t.status === 'Active')
        .reduce((sum, t) => sum + (t.rent || 0), 0);
    
    const collectedRevenue = payments
        .filter(p => p.month === currentMonth && p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Outstanding metrics
    const outstandingBalance = payments
        .filter(p => p.status !== 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const overdueCount = payments
        .filter(p => p.status === 'overdue')
        .length;
    
    // Update DOM with null checks
    safeSetText('totalTenants', totalTenants);
    safeSetText('activeTenants', activeTenants);
    safeSetText('pendingTenants', pendingTenants);
    
    safeSetText('totalUnits', totalUnits);
    safeSetText('occupiedUnits', occupiedUnits);
    safeSetText('vacantUnits', vacantUnits);
    
    safeSetText('monthlyRevenue', `KES ${formatNumber(monthlyRevenue)}`);
    safeSetText('collectedRevenue', `KES ${formatNumber(collectedRevenue)}`);
    
    safeSetText('outstandingBalance', `KES ${formatNumber(outstandingBalance)}`);
    safeSetText('overdueCount', overdueCount);
}

/**
 * Safely set text content of an element
 */
function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ==================== UPDATE RECENT TABLES ====================

/**
 * Update recent payments table
 */
function updateRecentPayments(payments) {
    const tableBody = document.getElementById('recentPaymentsTable');
    if (!tableBody) return;
    
    const recentPayments = [...payments]
        .sort((a, b) => {
            const dateA = a.paidDate || a.createdAt || '';
            const dateB = b.paidDate || b.createdAt || '';
            return dateB.localeCompare(dateA);
        })
        .slice(0, 5);
    
    if (recentPayments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-gray-500">
                    No recent payments
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    recentPayments.forEach(payment => {
        const statusClass = payment.status === 'paid' ? 'status-paid' : 
                           payment.status === 'pending' ? 'status-pending' : 'status-overdue';
        
        html += `
            <tr class="border-t border-gray-700">
                <td class="px-4 py-2">${escapeHtml(payment.tenantName || '')}</td>
                <td class="px-4 py-2">KES ${formatNumber(payment.amount || 0)}</td>
                <td class="px-4 py-2">${formatDate(payment.paidDate || payment.createdAt)}</td>
                <td class="px-4 py-2">
                    <span class="status-badge-sm ${statusClass}">
                        ${payment.status || 'unknown'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

/**
 * Update recent tenants table
 */
function updateRecentTenants(tenants) {
    const tableBody = document.getElementById('recentTenantsTable');
    if (!tableBody) return;
    
    const recentTenants = [...tenants]
        .sort((a, b) => {
            const dateA = a.createdAt || '';
            const dateB = b.createdAt || '';
            return dateB.localeCompare(dateA);
        })
        .slice(0, 5);
    
    if (recentTenants.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-gray-500">
                    No recent tenants
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    recentTenants.forEach(tenant => {
        const statusClass = tenant.status === 'Active' ? 'status-active' : 
                           tenant.status === 'Pending' ? 'status-pending' : 'status-inactive';
        
        html += `
            <tr class="border-t border-gray-700">
                <td class="px-4 py-2">${escapeHtml(tenant.name || '')}</td>
                <td class="px-4 py-2">${escapeHtml(tenant.unit || '')}</td>
                <td class="px-4 py-2">KES ${formatNumber(tenant.rent || 0)}</td>
                <td class="px-4 py-2">
                    <span class="status-badge-sm ${statusClass}">
                        ${tenant.status || 'unknown'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// ==================== CHARTS ====================

/**
 * Update charts with data
 */
function updateCharts(tenants, payments) {
    console.log('📊 Updating charts...');
    
    if (!isChartJsLoaded()) {
        console.error('Chart.js is not loaded!');
        return;
    }
    
    updatePaymentStatusChart(payments);
    updateMonthlyChart(payments);
}

/**
 * Update payment status chart
 */
function updatePaymentStatusChart(payments) {
    const canvas = document.getElementById('paymentStatusChart');
    if (!canvas) {
        console.warn('Payment status chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    const paid = payments.filter(p => p.status === 'paid').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const overdue = payments.filter(p => p.status === 'overdue').length;
    
    // Destroy existing chart
    if (paymentStatusChart) {
        paymentStatusChart.destroy();
    }
    
    // Create new chart
    paymentStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Paid', 'Pending', 'Overdue'],
            datasets: [{
                data: [paid, pending, overdue],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderColor: ['#059669', '#d97706', '#dc2626'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af' }
                }
            }
        }
    });
    
    console.log('✅ Payment status chart updated');
}

/**
 * Update monthly collection chart
 */
function updateMonthlyChart(payments) {
    const canvas = document.getElementById('monthlyCollectionChart');
    if (!canvas) {
        console.warn('Monthly collection chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get last 6 months
    const months = [];
    const collected = [];
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        
        months.push(date.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' }));
        
        const monthCollected = payments
            .filter(p => p.month === monthStr && p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        collected.push(monthCollected);
    }
    
    // Destroy existing chart
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Create new chart
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Collected',
                    data: collected,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#374151' },
                    ticks: { 
                        color: '#9ca3af',
                        callback: function(value) {
                            return 'KES ' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#9ca3af' }
                }
            }
        }
    });
    
    console.log('✅ Monthly chart updated');
}

// ==================== REFRESH FUNCTION ====================

window.refreshDashboard = function() {
    console.log('🔄 Refreshing dashboard...');
    loadDashboardData();
};

// ==================== HELPER FUNCTIONS ====================

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-KE', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==================== INITIALIZE ====================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 DOM loaded, initializing dashboard...');
    loadDashboardData();
});

console.log('✅ Dashboard script loaded');