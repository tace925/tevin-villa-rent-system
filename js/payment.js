// ==================== PAYMENTS MANAGEMENT - FIREBASE VERSION ====================

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc, 
    getDoc,
    query,
    where
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

console.log('🔥 Payments: Firebase initialized successfully');

// DOM Elements
const paymentsTableBody = document.getElementById('paymentsTableBody');
const loadingMessage = document.getElementById('loadingMessage');
const refreshBtn = document.getElementById('refreshBtn');
const recordPaymentBtn = document.getElementById('recordPaymentBtn');
const statusFilter = document.getElementById('statusFilter');
const monthFilter = document.getElementById('monthFilter');
const searchInput = document.getElementById('searchInput');
const paymentModal = document.getElementById('paymentModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const paymentForm = document.getElementById('paymentForm');
const paymentTenant = document.getElementById('paymentTenant');
const paymentMonth = document.getElementById('paymentMonth');
const paymentAmount = document.getElementById('paymentAmount');
const paymentMethod = document.getElementById('paymentMethod');
const paymentReference = document.getElementById('paymentReference');
const paymentNotes = document.getElementById('paymentNotes');
const chooseReceiptBtn = document.getElementById('chooseReceiptBtn');
const paymentReceipt = document.getElementById('paymentReceipt');
const receiptFileName = document.getElementById('receiptFileName');
const receiptPreview = document.getElementById('receiptPreview');
const receiptModal = document.getElementById('receiptModal');
const closeReceiptModalBtn = document.getElementById('closeReceiptModalBtn');
const receiptContent = document.getElementById('receiptContent');
const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
const printReceiptBtn = document.getElementById('printReceiptBtn');

// Summary elements
const totalCollectedEl = document.getElementById('totalCollected');
const expectedRentEl = document.getElementById('expectedRent');
const outstandingEl = document.getElementById('outstanding');
const thisMonthEl = document.getElementById('thisMonth');

// Global variables
let currentEditId = null;
let allPayments = [];
let allTenants = [];

// ==================== INITIALIZATION ====================

/**
 * Initialize the page
 */
async function initializePage() {
    console.log('Initializing payments page...');
    
    try {
        // Load tenants first for dropdown
        await loadTenants();
        
        // Load payments
        await loadPayments();
        
        console.log('✅ Page initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('Error initializing page: ' + error.message, 'error');
    }
}

// ==================== LOAD TENANTS ====================

/**
 * Load tenants from Firebase for dropdown
 */
async function loadTenants() {
    try {
        const querySnapshot = await getDocs(collection(db, "tenants"));
        allTenants = [];
        querySnapshot.forEach((doc) => {
            allTenants.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📊 Loaded ${allTenants.length} tenants from Firebase`);
        
        // Populate tenant dropdown
        populateTenantDropdown();
        
    } catch (error) {
        console.error('Error loading tenants:', error);
        showNotification('Error loading tenants: ' + error.message, 'error');
    }
}

/**
 * Populate tenant dropdown
 */
function populateTenantDropdown() {
    if (!paymentTenant) return;
    
    const activeTenants = allTenants.filter(t => t.status === 'Active');
    
    paymentTenant.innerHTML = '<option value="">Choose tenant...</option>';
    
    if (activeTenants.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.textContent = 'No active tenants found';
        paymentTenant.appendChild(option);
    } else {
        activeTenants.forEach(tenant => {
            const option = document.createElement('option');
            option.value = tenant.id;
            option.textContent = `${tenant.name} - ${tenant.unit} (KES ${formatNumber(tenant.rent || 0)})`;
            paymentTenant.appendChild(option);
        });
    }
}

// ==================== LOAD PAYMENTS ====================

/**
 * Load payments from Firebase
 */
async function loadPayments() {
    console.log('📊 Loading payments from Firebase...');
    
    if (loadingMessage) {
        loadingMessage.textContent = 'Loading payments from Firebase...';
    }
    
    try {
        const querySnapshot = await getDocs(collection(db, "payments"));
        allPayments = [];
        
        querySnapshot.forEach((doc) => {
            allPayments.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📊 Loaded ${allPayments.length} payments from Firebase`);
        
        // Apply filters and display
        applyFiltersAndDisplay();
        
        // Update summary cards
        await updateSummaryCards();
        
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        
        if (loadingMessage) {
            loadingMessage.textContent = 'Error loading payments. Check console.';
        }
        
        showNotification('Error loading payments: ' + error.message, 'error');
    }
}

// ==================== FILTERS ====================

/**
 * Apply filters and display payments
 */
function applyFiltersAndDisplay() {
    let filtered = [...allPayments];
    
    // Status filter
    const status = statusFilter?.value;
    if (status && status !== 'all') {
        filtered = filtered.filter(p => p.status === status);
    }
    
    // Month filter
    const month = monthFilter?.value;
    if (month && month !== 'all') {
        filtered = filtered.filter(p => p.month === month);
    }
    
    // Search filter
    const searchTerm = searchInput?.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(p => 
            (p.tenantName && p.tenantName.toLowerCase().includes(searchTerm)) ||
            (p.unit && p.unit.toLowerCase().includes(searchTerm)) ||
            (p.reference && p.reference.toLowerCase().includes(searchTerm))
        );
    }
    
    displayPayments(filtered);
}

/**
 * Display payments in table
 * @param {Array} payments - Array of payment objects
 */
function displayPayments(payments) {
    if (!paymentsTableBody) return;
    
    if (payments.length === 0) {
        paymentsTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-12 text-gray-500">
                    <div class="empty-state">
                        <i class="fas fa-credit-card"></i>
                        <p>No payments found. Click "Record Payment" to add one.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by month (newest first)
    payments.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    
    let html = '';
    payments.forEach(payment => {
        const statusClass = payment.status === 'paid' ? 'status-paid' : 
                           payment.status === 'pending' ? 'status-pending' : 'status-overdue';
        
        const paidDate = payment.paidDate ? formatDate(payment.paidDate) : '-';
        const methodIcon = getPaymentMethodIcon(payment.method);
        const methodText = payment.method ? payment.method.toUpperCase() : '-';
        
        html += `
            <tr class="border-t border-gray-700 hover:bg-gray-800/50">
                <td class="px-6 py-4">
                    <div class="font-medium">${escapeHtml(payment.tenantName || '')}</div>
                </td>
                <td class="px-6 py-4">${escapeHtml(payment.unit || '')}</td>
                <td class="px-6 py-4">${formatMonth(payment.month)}</td>
                <td class="px-6 py-4 font-medium">KES ${formatNumber(payment.amount || 0)}</td>
                <td class="px-6 py-4">${paidDate}</td>
                <td class="px-6 py-4">
                    <span class="flex items-center gap-1">
                        ${methodIcon} ${methodText}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="status-badge ${statusClass}">
                        ${payment.status ? payment.status.toUpperCase() : 'UNKNOWN'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    ${payment.receipt ? 
                        `<button onclick="window.viewReceipt('${payment.id}')" class="action-btn view" title="View Receipt">
                            <i class="fas fa-file-pdf"></i>
                        </button>` : 
                        '<span class="text-gray-600">-</span>'
                    }
                </td>
                <td class="px-6 py-4">
                    <button onclick="window.editPayment('${payment.id}')" class="action-btn edit" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deletePayment('${payment.id}')" class="action-btn delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    paymentsTableBody.innerHTML = html;
}

// ==================== SUMMARY CARDS ====================

/**
 * Update summary cards
 */
async function updateSummaryCards() {
    try {
        // Total collected from paid payments
        const totalCollected = allPayments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Expected rent from active tenants
        const expectedRent = allTenants
            .filter(t => t.status === 'Active')
            .reduce((sum, t) => sum + (t.rent || 0), 0);
        
        // Outstanding (pending + overdue)
        const outstanding = allPayments
            .filter(p => p.status !== 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // This month's collections
        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthCollected = allPayments
            .filter(p => p.month === currentMonth && p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Update DOM
        if (totalCollectedEl) totalCollectedEl.textContent = `KES ${formatNumber(totalCollected)}`;
        if (expectedRentEl) expectedRentEl.textContent = `KES ${formatNumber(expectedRent)}`;
        if (outstandingEl) outstandingEl.textContent = `KES ${formatNumber(outstanding)}`;
        if (thisMonthEl) thisMonthEl.textContent = `KES ${formatNumber(thisMonthCollected)}`;
        
    } catch (error) {
        console.error('Error updating summary cards:', error);
    }
}

// ==================== MODAL FUNCTIONS ====================

/**
 * Show the payment modal
 */
function showModal() {
    if (!paymentModal) return;
    
    // Set default month to current
    const today = new Date();
    const yearMonth = today.toISOString().slice(0, 7);
    if (paymentMonth) paymentMonth.value = yearMonth;
    
    paymentModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Hide the payment modal
 */
function hideModal() {
    if (!paymentModal) return;
    
    paymentModal.classList.remove('show');
    document.body.style.overflow = '';
    resetForm();
}

/**
 * Reset form to add mode
 */
function resetForm() {
    if (paymentForm) paymentForm.reset();
    resetReceiptUpload();
    currentEditId = null;
    
    // Reset modal title and button
    const modalTitle = document.querySelector('#paymentModal h3');
    if (modalTitle) modalTitle.textContent = 'Record New Payment';
    
    const submitBtn = document.querySelector('#paymentForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Record Payment';
}

/**
 * Reset receipt upload UI
 */
function resetReceiptUpload() {
    if (receiptFileName) receiptFileName.textContent = 'No file chosen';
    if (receiptPreview) receiptPreview.innerHTML = '<i class="fas fa-file-pdf text-gray-500"></i>';
    if (paymentReceipt) paymentReceipt.value = '';
}

// ==================== PAYMENT OPERATIONS ====================

/**
 * Save payment to Firebase
 */
async function savePayment(e) {
    e.preventDefault();
    
    const tenantId = paymentTenant?.value;
    
    if (!tenantId) {
        alert('Please select a tenant');
        return;
    }
    
    // Find selected tenant
    const selectedTenant = allTenants.find(t => t.id === tenantId);
    
    const month = paymentMonth?.value;
    const amount = parseFloat(paymentAmount?.value) || (selectedTenant?.rent || 0);
    const method = paymentMethod?.value;
    
    if (!month) {
        alert('Please select payment month');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (!method) {
        alert('Please select payment method');
        return;
    }
    
    // Check if payment already exists for this tenant and month
    const existingPayment = allPayments.find(p => 
        p.tenantId === tenantId && 
        p.month === month && 
        p.id !== currentEditId
    );
    
    if (existingPayment) {
        if (!confirm('A payment for this tenant and month already exists. Do you want to add another?')) {
            return;
        }
    }
    
    const receiptFile = paymentReceipt?.files[0];
    
    const paymentData = {
        tenantId: tenantId,
        tenantName: selectedTenant?.name || '',
        unit: selectedTenant?.unit || '',
        month: month,
        amount: amount,
        paidDate: new Date().toISOString().split('T')[0],
        method: method,
        reference: paymentReference?.value || '',
        status: 'paid',
        notes: paymentNotes?.value || '',
        updatedAt: new Date().toISOString()
    };
    
    if (receiptFile) {
        const reader = new FileReader();
        reader.onload = async (fileData) => {
            paymentData.receipt = fileData.target.result;
            await savePaymentToFirebase(paymentData);
        };
        reader.readAsDataURL(receiptFile);
    } else {
        paymentData.receipt = null;
        await savePaymentToFirebase(paymentData);
    }
}

/**
 * Save payment to Firebase
 * @param {Object} paymentData - Payment data to save
 */
async function savePaymentToFirebase(paymentData) {
    try {
        if (currentEditId) {
            // Update existing
            const paymentRef = doc(db, "payments", currentEditId);
            await updateDoc(paymentRef, paymentData);
            showNotification('Payment updated successfully!', 'success');
        } else {
            // Add new
            paymentData.createdAt = new Date().toISOString();
            const docRef = await addDoc(collection(db, "payments"), paymentData);
            console.log("Payment saved with ID:", docRef.id);
            showNotification('Payment recorded successfully!', 'success');
        }
        
        hideModal();
        await loadPayments(); // Reload to show new data
        
    } catch (error) {
        console.error('Firebase save error:', error);
        showNotification('Error saving payment: ' + error.message, 'error');
    }
}

/**
 * Delete payment
 * @param {string} id - Payment ID
 */
window.deletePayment = async function(id) {
    if (!confirm('Are you sure you want to delete this payment record?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, "payments", id));
        showNotification('Payment deleted successfully', 'info');
        await loadPayments();
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Error deleting payment: ' + error.message, 'error');
    }
};

/**
 * Edit payment
 * @param {string} id - Payment ID
 */
window.editPayment = async function(id) {
    currentEditId = id;
    
    try {
        const docRef = doc(db, "payments", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const payment = docSnap.data();
            
            // Populate form
            if (paymentTenant) paymentTenant.value = payment.tenantId || '';
            if (paymentMonth) paymentMonth.value = payment.month || '';
            if (paymentAmount) paymentAmount.value = payment.amount || '';
            if (paymentMethod) paymentMethod.value = payment.method || '';
            if (paymentReference) paymentReference.value = payment.reference || '';
            if (paymentNotes) paymentNotes.value = payment.notes || '';
            
            // Change modal title and button
            const modalTitle = document.querySelector('#paymentModal h3');
            if (modalTitle) modalTitle.textContent = 'Edit Payment';
            
            const submitBtn = document.querySelector('#paymentForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Update Payment';
            
            showModal();
        }
    } catch (error) {
        console.error('Edit error:', error);
        showNotification('Error loading payment: ' + error.message, 'error');
    }
};

/**
 * View receipt
 * @param {string} id - Payment ID
 */
window.viewReceipt = async function(id) {
    try {
        const docRef = doc(db, "payments", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().receipt) {
            const payment = docSnap.data();
            showReceiptModal(payment);
        } else {
            alert('No receipt available for this payment');
        }
    } catch (error) {
        console.error('Receipt error:', error);
        showNotification('Error loading receipt: ' + error.message, 'error');
    }
};

/**
 * Show receipt modal
 * @param {Object} payment - Payment object
 */
function showReceiptModal(payment) {
    const receiptHtml = `
        <div class="receipt-container">
            <div class="receipt-header">
                <div class="receipt-title">TEVIN VILLA</div>
                <p class="text-gray-600">Payment Receipt</p>
            </div>
            
            <div class="receipt-details">
                <div class="receipt-row">
                    <span class="receipt-label">Receipt No:</span>
                    <span class="receipt-value">${payment.id || 'N/A'}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Date:</span>
                    <span class="receipt-value">${formatDate(payment.paidDate)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Tenant:</span>
                    <span class="receipt-value">${escapeHtml(payment.tenantName || '')}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Unit:</span>
                    <span class="receipt-value">${escapeHtml(payment.unit || '')}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Month:</span>
                    <span class="receipt-value">${formatMonth(payment.month)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Amount:</span>
                    <span class="receipt-value font-bold">KES ${formatNumber(payment.amount || 0)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Method:</span>
                    <span class="receipt-value">${payment.method ? payment.method.toUpperCase() : '-'}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Reference:</span>
                    <span class="receipt-value">${escapeHtml(payment.reference || '-')}</span>
                </div>
            </div>
            
            <div class="receipt-footer">
                <p>Thank you for your payment!</p>
                <p class="text-xs mt-2">This is a computer generated receipt</p>
            </div>
        </div>
    `;
    
    if (receiptContent) {
        receiptContent.innerHTML = receiptHtml;
    }
    
    receiptModal.classList.add('show');
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format date to readable string
 * @param {string} dateStr - Date string
 * @returns {string} Formatted date
 */
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

/**
 * Format month to readable string
 * @param {string} monthStr - Month string (YYYY-MM)
 * @returns {string} Formatted month
 */
function formatMonth(monthStr) {
    if (!monthStr) return '-';
    try {
        const [year, month] = monthStr.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-KE', { 
            year: 'numeric', 
            month: 'long' 
        });
    } catch (e) {
        return monthStr;
    }
}

/**
 * Get payment method icon
 * @param {string} method - Payment method
 * @returns {string} Icon HTML
 */
function getPaymentMethodIcon(method) {
    switch(method) {
        case 'mpesa':
            return '<i class="fas fa-mobile-alt text-green-400"></i>';
        case 'bank':
            return '<i class="fas fa-university text-blue-400"></i>';
        case 'cash':
            return '<i class="fas fa-money-bill-wave text-yellow-400"></i>';
        case 'cheque':
            return '<i class="fas fa-money-check text-purple-400"></i>';
        default:
            return '<i class="fas fa-question-circle text-gray-400"></i>';
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} unsafe - Unsafe string
 * @returns {string} Escaped string
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - 'success', 'error', 'info'
 */
function showNotification(message, type = 'info') {
    // You can replace this with a toast notification later
    alert(message);
}

// ==================== DEBOUNCE FUNCTION ====================

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==================== EVENT LISTENERS ====================

// Record Payment button
if (recordPaymentBtn) {
    recordPaymentBtn.addEventListener('click', showModal);
}

// Refresh button
if (refreshBtn) {
    refreshBtn.addEventListener('click', loadPayments);
}

// Close modal buttons
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', hideModal);
}

// Close receipt modal
if (closeReceiptModalBtn) {
    closeReceiptModalBtn.addEventListener('click', () => {
        receiptModal.classList.remove('show');
    });
}

// Filter events
if (statusFilter) {
    statusFilter.addEventListener('change', applyFiltersAndDisplay);
}

if (monthFilter) {
    monthFilter.addEventListener('change', applyFiltersAndDisplay);
}

if (searchInput) {
    searchInput.addEventListener('input', debounce(applyFiltersAndDisplay, 300));
}

// Receipt upload
if (chooseReceiptBtn && paymentReceipt) {
    chooseReceiptBtn.addEventListener('click', () => {
        paymentReceipt.click();
    });
}

if (paymentReceipt) {
    paymentReceipt.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            receiptFileName.textContent = file.name;
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    receiptPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            } else {
                receiptPreview.innerHTML = '<i class="fas fa-file-pdf text-red-400"></i>';
            }
        } else {
            resetReceiptUpload();
        }
    });
}

// Form submission
if (paymentForm) {
    paymentForm.addEventListener('submit', savePayment);
}

// Download receipt
if (downloadReceiptBtn) {
    downloadReceiptBtn.addEventListener('click', () => {
        alert('Download functionality - Would generate PDF in production');
    });
}

// Print receipt
if (printReceiptBtn) {
    printReceiptBtn.addEventListener('click', () => {
        const receiptElement = document.querySelector('.receipt-container');
        if (receiptElement) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Payment Receipt</title>
                        <style>
                            body { font-family: Arial; padding: 20px; }
                            .receipt-container { max-width: 600px; margin: 0 auto; }
                        </style>
                    </head>
                    <body>${receiptElement.outerHTML}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    });
}

// Close modals when clicking outside
if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            hideModal();
        }
    });
}

if (receiptModal) {
    receiptModal.addEventListener('click', (e) => {
        if (e.target === receiptModal) {
            receiptModal.classList.remove('show');
        }
    });
}

// Handle escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (paymentModal?.classList.contains('show')) {
            hideModal();
        }
        if (receiptModal?.classList.contains('show')) {
            receiptModal.classList.remove('show');
        }
    }
});

// Make functions available globally
window.viewReceipt = viewReceipt;
window.editPayment = editPayment;
window.deletePayment = deletePayment;

// ==================== INITIALIZE ====================
initializePage();

console.log('✅ Payments page initialized with Firebase');