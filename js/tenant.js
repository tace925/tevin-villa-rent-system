// ==================== CONFIGURATION ====================
const USE_FIREBASE = true; // MUST be true

// Make sure these imports are at the top
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
// ==================== TEST FIREBASE CONNECTION ====================
console.log('🔥 Testing Firebase connection...');

// Test if Firebase is accessible
setTimeout(async () => {
    try {
        const testSnapshot = await getDocs(collection(db, "tenants"));
        console.log(`✅ Firebase connected! Found ${testSnapshot.size} tenants`);
        testSnapshot.forEach(doc => {
            console.log('📄 Tenant doc:', doc.id, doc.data());
        });
    } catch (error) {
        console.error('❌ Firebase connection failed:', error);
    }
}, 1000);
// ==================== SIMPLE TENANTS MANAGEMENT ====================

// Wait for Firebase to load
window.addEventListener('load', function() {
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.log('Firebase not available, using localStorage');
        initializeLocalOnly();
    } else {
        console.log('Firebase available');
        initializeFirebase();
    }
});

// DOM Elements
const tenantsTableBody = document.getElementById('tenantsTableBody');
const loadingMessage = document.getElementById('loadingMessage');
const addTenantBtn = document.getElementById('addTenantBtn');
const refreshBtn = document.getElementById('refreshBtn');
const tenantModal = document.getElementById('tenantModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const tenantForm = document.getElementById('tenantForm');
const choosePhotoBtn = document.getElementById('choosePhotoBtn');
const tenantPhoto = document.getElementById('tenantPhoto');
const fileName = document.getElementById('fileName');
const photoPreview = document.getElementById('photoPreview');

// Global variables
let currentEditId = null;
let db = null;

// Sample data
const sampleTenants = [
    {
        name: 'Tevin Mulinge',
        email: 'tevinnmulinge48@gmail.com',
        phone: '0797510552',
        unit: 'A-001',
        rent: 15000,
        status: 'Active',
        photo: null,
        createdAt: new Date().toISOString()
    },
    {
        name: 'Jane Doe',
        email: 'jane.doe@email.com',
        phone: '0712345678',
        unit: 'B-002',
        rent: 18000,
        status: 'Active',
        photo: null,
        createdAt: new Date().toISOString()
    },
    {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '0723456789',
        unit: 'C-003',
        rent: 12000,
        status: 'Pending',
        photo: null,
        createdAt: new Date().toISOString()
    }
];

// ==================== FIREBASE INITIALIZATION ====================

function initializeFirebase() {
    // Your Firebase config
    const firebaseConfig = {
        apiKey: "AIzaSyCyLApPHELtMZlvW3sIaqEHqCTds3jPVHo",
        authDomain: "tevin-villa-system.firebaseapp.com",
        projectId: "tevin-villa-system",
        storageBucket: "tevin-villa-system.firebasestorage.app",
        messagingSenderId: "172735256047",
        appId: "1:172735256047:web:70ec19ad5239d136d2d21a",
        measurementId: "G-P2L9R6P8DH"
    };
    
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    console.log('🔥 Firebase initialized');
    loadTenants();
}

function initializeLocalOnly() {
    console.log('✅ Using localStorage');
    initializeLocalData();
    loadTenantsFromLocal();
}

// ==================== LOCAL STORAGE FUNCTIONS ====================

function initializeLocalData() {
    const tenants = localStorage.getItem('tenants');
    if (!tenants || JSON.parse(tenants).length === 0) {
        const tenantsWithIds = sampleTenants.map((tenant, index) => ({
            id: (index + 1).toString(),
            ...tenant
        }));
        localStorage.setItem('tenants', JSON.stringify(tenantsWithIds));
        console.log('Sample tenants added to localStorage');
    }
}

function loadTenantsFromLocal() {
    setTimeout(() => {
        const tenants = JSON.parse(localStorage.getItem('tenants')) || [];
        displayTenants(tenants);
    }, 500);
}

function saveToLocalStorage(tenantData) {
    const tenants = JSON.parse(localStorage.getItem('tenants')) || [];
    
    if (currentEditId) {
        const index = tenants.findIndex(t => t.id === currentEditId);
        if (index !== -1) {
            tenants[index] = { ...tenants[index], ...tenantData };
            alert('Tenant updated successfully!');
        }
    } else {
        const newTenant = {
            id: Date.now().toString(),
            ...tenantData,
            createdAt: new Date().toISOString()
        };
        tenants.push(newTenant);
        alert('Tenant added successfully!');
    }
    
    localStorage.setItem('tenants', JSON.stringify(tenants));
    hideModal();
    loadTenantsFromLocal();
}

function deleteFromLocalStorage(id) {
    const tenants = JSON.parse(localStorage.getItem('tenants')) || [];
    const filtered = tenants.filter(t => t.id !== id);
    localStorage.setItem('tenants', JSON.stringify(filtered));
    loadTenantsFromLocal();
    alert('Tenant deleted successfully');
}

// ==================== FIREBASE FUNCTIONS ====================

async function loadTenantsFromFirebase() {
    try {
        const snapshot = await db.collection("tenants").get();
        const tenants = [];
        snapshot.forEach(doc => {
            tenants.push({ id: doc.id, ...doc.data() });
        });
        displayTenants(tenants);
    } catch (error) {
        console.error('Firebase error:', error);
        loadTenantsFromLocal();
    }
}

async function saveToFirebase(tenantData) {
    try {
        if (currentEditId) {
            await db.collection("tenants").doc(currentEditId).update(tenantData);
            alert('Tenant updated in Firebase!');
        } else {
            tenantData.createdAt = new Date().toISOString();
            await db.collection("tenants").add(tenantData);
            alert('Tenant added to Firebase!');
        }
        hideModal();
        loadTenantsFromFirebase();
    } catch (error) {
        console.error('Firebase error:', error);
        alert('Firebase error, saving to localStorage instead');
        saveToLocalStorage(tenantData);
    }
}

async function deleteFromFirebase(id) {
    try {
        await db.collection("tenants").doc(id).delete();
        alert('Tenant deleted from Firebase');
        loadTenantsFromFirebase();
    } catch (error) {
        console.error('Firebase error:', error);
        deleteFromLocalStorage(id);
    }
}

// ==================== COMMON FUNCTIONS ====================

function loadTenants() {
    if (loadingMessage) loadingMessage.textContent = 'Loading tenants...';
    
    if (db) {
        loadTenantsFromFirebase();
    } else {
        loadTenantsFromLocal();
    }
}

function displayTenants(tenants) {
    if (!tenantsTableBody) return;
    
    if (tenants.length === 0) {
        tenantsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-gray-500">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-user-slash text-4xl mb-3"></i>
                        <p>No tenants found. Click "Add New Tenant" to get started.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    tenants.forEach(tenant => {
        const photoHtml = tenant.photo 
            ? `<img src="${tenant.photo}" class="w-10 h-10 rounded-full object-cover">`
            : `<div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-gray-400"></i>
               </div>`;
        
        const statusClass = tenant.status === 'Active' ? 'bg-green-900/30 text-green-400' : 
                           tenant.status === 'Pending' ? 'bg-yellow-900/30 text-yellow-400' : 
                           'bg-red-900/30 text-red-400';
        
        html += `
            <tr class="border-t border-gray-700">
                <td class="px-6 py-4">${photoHtml}</td>
                <td class="px-6 py-4">${tenant.name || ''}</td>
                <td class="px-6 py-4">${tenant.email || ''}</td>
                <td class="px-6 py-4">${tenant.phone || ''}</td>
                <td class="px-6 py-4">${tenant.unit || ''}</td>
                <td class="px-6 py-4">KES ${(tenant.rent || 0).toLocaleString()}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 ${statusClass} rounded-full text-xs">${tenant.status}</span>
                </td>
                <td class="px-6 py-4">
                    <button onclick="editTenant('${tenant.id}')" class="text-blue-400 hover:text-blue-300 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteTenant('${tenant.id}')" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tenantsTableBody.innerHTML = html;
}

async function saveTenant(e) {
    e.preventDefault();
    
    const photoFile = tenantPhoto.files[0];
    
    const tenantData = {
        name: document.getElementById('tenantName').value.trim(),
        email: document.getElementById('tenantEmail').value.trim(),
        phone: document.getElementById('tenantPhone').value.trim(),
        unit: document.getElementById('tenantUnit').value.trim(),
        rent: parseInt(document.getElementById('tenantRent').value) || 0,
        status: document.getElementById('tenantStatus').value,
        updatedAt: new Date().toISOString()
    };
    
    if (!tenantData.name || !tenantData.email || !tenantData.phone || !tenantData.unit) {
        alert('Please fill all required fields');
        return;
    }
    
    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(fileData) {
            tenantData.photo = fileData.target.result;
            if (db) {
                saveToFirebase(tenantData);
            } else {
                saveToLocalStorage(tenantData);
            }
        };
        reader.readAsDataURL(photoFile);
    } else {
        tenantData.photo = null;
        if (db) {
            saveToFirebase(tenantData);
        } else {
            saveToLocalStorage(tenantData);
        }
    }
}

window.editTenant = async function(id) {
    currentEditId = id;
    
    let tenant;
    if (db) {
        try {
            const doc = await db.collection("tenants").doc(id).get();
            if (doc.exists) tenant = { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error(error);
        }
    } else {
        const tenants = JSON.parse(localStorage.getItem('tenants')) || [];
        tenant = tenants.find(t => t.id === id);
    }
    
    if (tenant) {
        document.getElementById('tenantName').value = tenant.name || '';
        document.getElementById('tenantEmail').value = tenant.email || '';
        document.getElementById('tenantPhone').value = tenant.phone || '';
        document.getElementById('tenantUnit').value = tenant.unit || '';
        document.getElementById('tenantRent').value = tenant.rent || '';
        document.getElementById('tenantStatus').value = tenant.status || 'Active';
        
        if (tenant.photo) {
            photoPreview.innerHTML = `<img src="${tenant.photo}" class="w-16 h-16 rounded-lg object-cover">`;
            fileName.textContent = 'Current photo';
        }
        
        document.querySelector('#tenantModal h3').textContent = 'Edit Tenant';
        document.querySelector('#tenantForm button[type="submit"]').textContent = 'Update Tenant';
        showModal();
    }
};

window.deleteTenant = function(id) {
    if (confirm('Delete this tenant?')) {
        if (db) {
            deleteFromFirebase(id);
        } else {
            deleteFromLocalStorage(id);
        }
    }
};

function showModal() {
    tenantModal.classList.remove('hidden');
    tenantModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    tenantModal.classList.add('hidden');
    tenantModal.classList.remove('flex');
    document.body.style.overflow = '';
    resetForm();
}

function resetForm() {
    tenantForm.reset();
    fileName.textContent = 'No file chosen';
    photoPreview.innerHTML = '<i class="fas fa-camera text-gray-500"></i>';
    currentEditId = null;
    document.querySelector('#tenantModal h3').textContent = 'Add New Tenant';
    document.querySelector('#tenantForm button[type="submit"]').textContent = 'Save Tenant';
}

// Event Listeners
if (addTenantBtn) addTenantBtn.addEventListener('click', showModal);
if (refreshBtn) refreshBtn.addEventListener('click', loadTenants);
if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

if (choosePhotoBtn && tenantPhoto) {
    choosePhotoBtn.addEventListener('click', () => tenantPhoto.click());
}

if (tenantPhoto) {
    tenantPhoto.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileName.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.innerHTML = `<img src="${e.target.result}" class="w-16 h-16 rounded-lg object-cover">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (tenantForm) {
    tenantForm.addEventListener('submit', saveTenant);
}

if (tenantModal) {
    tenantModal.addEventListener('click', (e) => {
        if (e.target === tenantModal) hideModal();
    });
}