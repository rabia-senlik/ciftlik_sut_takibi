// ============================================================================
// ÇİFTLİK SÜT TAKİP SİSTEMİ - APP.JS
// Yönetici (Admin) & Müşteri Portalı, Manuel Fiyat Ayarı ve Firestore Senkronizasyon
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================================
// 1. FIREBASE YAPILANDIRMASI (FIREBASE CONFIGURATION)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCzXBTF6T2tO713cSGq4ew0erjTiplDnO0",
  authDomain: "ciftliksut-d6398.firebaseapp.com",
  projectId: "ciftliksut-d6398",
  storageBucket: "ciftliksut-d6398.firebasestorage.app",
  messagingSenderId: "288263218516",
  appId: "1:288263218516:web:8cc25a85724fc7b37f94c1",
  measurementId: "G-YZGKSJ6RG6"
};

// Firebase & Firestore Başlatma
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Koleksiyon İsimleri
const COL_RECORDS = "sut_kayitlari";
const COL_USERS = "kullanicilar";
const COL_SETTINGS = "ayarlar";
const COL_CUSTOMER_LOGS = "musteri_islemleri";

// ============================================================================
// 2. GLOBAL DURUM (STATE)
// ============================================================================
let currentUser = null; // { kullaniciAdi, adSoyad, rol, id }
let currentLitrePrice = 25.0; // Varsayılan Süt Litre Fiyatı (TL)
let allRecords = [];
let allCustomers = [];
let allCustomerLogs = [];
let formCustomers = []; // Adminin o günkü kayıt için eklediği kişiler: [{ adSoyad, miktar, tutar, musteriKullaniciAdi }]
let recordToDeleteId = null;

// ============================================================================
// 3. DOM ELEMENTLERİ
// ============================================================================

// Görünümler (Views)
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const customerView = document.getElementById("customer-view");

// Navbar Elementleri
const headerSubtitle = document.getElementById("header-subtitle");
const navPriceDisplay = document.getElementById("nav-price-display");
const priceBadgeBtn = document.getElementById("price-badge-btn");
const userDisplayName = document.getElementById("user-display-name");
const userRoleTag = document.getElementById("user-role-tag");
const userAvatar = document.getElementById("user-avatar");
const logoutBtn = document.getElementById("logout-btn");
const toastContainer = document.getElementById("toast-container");

// Giriş Formu Elementleri
const loginForm = document.getElementById("login-form");
const loginUsernameInput = document.getElementById("login-username");
const loginPasswordInput = document.getElementById("login-password");

// Admin Sekme Butonları & Bölümleri
const tabMilkBtn = document.getElementById("tab-milk-btn");
const tabCustomersBtn = document.getElementById("tab-customers-btn");
const adminMilkSection = document.getElementById("admin-milk-section");
const adminCustomersSection = document.getElementById("admin-customers-section");
const adminCustomerCountBadge = document.getElementById("admin-customer-count-badge");
const quickChangePriceBtn = document.getElementById("quick-change-price-btn");
const quickPriceVal = document.getElementById("quick-price-val");

// Admin Süt Formu
const milkForm = document.getElementById("milk-form");
const dateInput = document.getElementById("input-date");
const totalInput = document.getElementById("input-total");
const factoryInput = document.getElementById("input-factory");
const customerNameInput = document.getElementById("customer-name");
const customerDatalist = document.getElementById("customer-datalist");
const customerAmountInput = document.getElementById("customer-amount");
const addCustomerBtn = document.getElementById("add-customer-btn");
const customerListBox = document.getElementById("customer-list-box");
const badgeHalkToplam = document.getElementById("badge-halk-toplam");
const noteInput = document.getElementById("input-note");
const submitBtn = document.getElementById("submit-btn");
const submitText = document.getElementById("submit-text");
const submitSpinner = document.getElementById("submit-spinner");
const resetBtn = document.getElementById("reset-btn");

// Admin Canlı Hesaplama
const liveDistributed = document.getElementById("live-distributed");
const liveRemaining = document.getElementById("live-remaining");
const liveBar = document.getElementById("live-bar");
const liveAlert = document.getElementById("live-alert");
const liveBox = document.getElementById("live-box");

// Admin İstatistik Kartları
const statTotal = document.getElementById("stat-total");
const statTotalMoney = document.getElementById("stat-total-money");
const statFactory = document.getElementById("stat-factory");
const statFactoryMoney = document.getElementById("stat-factory-money");
const statPublic = document.getElementById("stat-public");
const statPublicMoney = document.getElementById("stat-public-money");
const statRemaining = document.getElementById("stat-remaining");

// Admin Tablo & Arama
const recordsTableBody = document.getElementById("records-table-body");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");

// Admin Müşteri Yönetimi Elementleri
const newCustomerForm = document.getElementById("new-customer-form");
const newCustName = document.getElementById("new-cust-name");
const newCustUsername = document.getElementById("new-cust-username");
const newCustPassword = document.getElementById("new-cust-password");
const newCustPhone = document.getElementById("new-cust-phone");
const customersTableBody = document.getElementById("customers-table-body");
const customersEmptyState = document.getElementById("customers-empty-state");

// Müşteri Portalı Elementleri
const custPortalWelcome = document.getElementById("cust-portal-welcome");
const custCurrentPriceBadge = document.getElementById("cust-current-price-badge");
const custTotalMilk = document.getElementById("cust-total-milk");
const custCardPrice = document.getElementById("cust-card-price");
const custTotalMoney = document.getElementById("cust-total-money");
const custTotalRecordsCount = document.getElementById("cust-total-records-count");
const custMilkForm = document.getElementById("cust-milk-form");
const custInputDate = document.getElementById("cust-input-date");
const custInputAmount = document.getElementById("cust-input-amount");
const custInputNote = document.getElementById("cust-input-note");
const custLiveCalcTotal = document.getElementById("cust-live-calc-total");
const custRecordsTableBody = document.getElementById("cust-records-table-body");
const custEmptyState = document.getElementById("cust-empty-state");

// Modallar
const priceModal = document.getElementById("price-modal");
const priceForm = document.getElementById("price-form");
const priceInput = document.getElementById("price-input");
const closePriceModalBtn = document.getElementById("close-price-modal-btn");
const cancelPriceBtn = document.getElementById("cancel-price-btn");

const customerDetailModal = document.getElementById("customer-detail-modal");
const customerModalSubtitle = document.getElementById("customer-modal-subtitle");
const customerModalList = document.getElementById("customer-modal-list");
const customerModalTotal = document.getElementById("customer-modal-total");
const closeCustomerModalBtn = document.getElementById("close-customer-modal-btn");

const deleteModal = document.getElementById("delete-modal");
const deleteModalText = document.getElementById("delete-modal-text");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

// ============================================================================
// 4. BAŞLANGIÇ (INIT)
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  setDefaultDates();
  setupEventListeners();
  initSettingsListener();
  initUsersListener();
  checkPersistedSession();
});

function setDefaultDates() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const formatted = `${yyyy}-${mm}-${dd}`;
  
  if (dateInput) dateInput.value = formatted;
  if (custInputDate) custInputDate.value = formatted;
}

// ============================================================================
// 5. ETKİNLİK DİNLEYİCİLERİ (EVENT LISTENERS)
// ============================================================================
function setupEventListeners() {
  // Giriş Yap Formu
  loginForm.addEventListener("submit", handleLogin);

  // Çıkış Butonu
  logoutBtn.addEventListener("click", handleLogout);

  // Admin Sekme Değişimi
  tabMilkBtn.addEventListener("click", () => switchAdminTab("milk"));
  tabCustomersBtn.addEventListener("click", () => switchAdminTab("customers"));

  // Fiyat Modalı Açma
  [priceBadgeBtn, quickChangePriceBtn].forEach(btn => {
    if (btn) btn.addEventListener("click", openPriceModal);
  });
  closePriceModalBtn.addEventListener("click", closePriceModal);
  cancelPriceBtn.addEventListener("click", closePriceModal);
  priceForm.addEventListener("submit", handleSavePrice);

  // Admin Süt Formu Canlı Hesaplama
  [totalInput, factoryInput].forEach(inp => {
    inp.addEventListener("input", handleLiveCalculation);
  });

  // Admin Müşteri Ekle Butonu (Form İçi)
  if (addCustomerBtn) {
    addCustomerBtn.addEventListener("click", handleAddFormCustomer);
  }
  [customerNameInput, customerAmountInput].forEach(inp => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddFormCustomer();
      }
    });
  });

  // Admin Süt Formu Gönderme & Sıfırlama
  milkForm.addEventListener("submit", handleAdminFormSubmit);
  resetBtn.addEventListener("click", () => {
    milkForm.reset();
    formCustomers = [];
    renderFormCustomerList();
    setDefaultDates();
    handleLiveCalculation();
  });

  // Admin Tablo Arama
  searchInput.addEventListener("input", (e) => {
    filterRecords(e.target.value.toLowerCase().trim());
  });

  // Admin Yeni Müşteri Tanımlama Formu
  newCustomerForm.addEventListener("submit", handleCreateNewCustomer);

  // Müşteri Portalı Canlı Hesaplama & Form
  if (custInputAmount) {
    custInputAmount.addEventListener("input", handleCustomerLiveCalc);
  }
  if (custMilkForm) {
    custMilkForm.addEventListener("submit", handleCustomerFormSubmit);
  }

  // Modalları Kapatma
  if (closeCustomerModalBtn) closeCustomerModalBtn.addEventListener("click", closeCustomerModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", executeDelete);
}

// ============================================================================
// 6. KULLANICI GİRİŞİ & OTURUM YÖNETİMİ
// ============================================================================
async function handleLogin(e) {
  e.preventDefault();
  const username = loginUsernameInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value.trim();

  if (!username || !password) {
    showToast("Lütfen kullanıcı adı ve şifrenizi girin.", "warning");
    return;
  }

  // 1. Admin Girişi Kontrolü (admin / 123)
  if (username === "admin" && password === "123") {
    const adminUser = {
      id: "admin_root",
      kullaniciAdi: "admin",
      adSoyad: "Çiftlik Yöneticisi",
      rol: "admin"
    };
    setSession(adminUser);
    showToast("Yönetici girişi başarılı!", "success");
    return;
  }

  // 2. Müşteri Girişi Kontrolü (Koleksiyondan sorgula)
  const matchedCustomer = allCustomers.find(
    c => c.kullaniciAdi.toLowerCase() === username && c.sifre === password
  );

  if (matchedCustomer) {
    const customerUser = {
      id: matchedCustomer.id,
      kullaniciAdi: matchedCustomer.kullaniciAdi,
      adSoyad: matchedCustomer.adSoyad,
      rol: "musteri",
      telefon: matchedCustomer.telefon || ""
    };
    setSession(customerUser);
    showToast(`Hoş geldiniz, ${customerUser.adSoyad}!`, "success");
    return;
  }

  showToast("Hatalı kullanıcı adı veya şifre girdiniz!", "error");
}

function setSession(user) {
  currentUser = user;
  localStorage.setItem("ciftlik_aktif_kullanici", JSON.stringify(user));
  applyUserView();
}

function checkPersistedSession() {
  try {
    const raw = localStorage.getItem("ciftlik_aktif_kullanici");
    if (raw) {
      currentUser = JSON.parse(raw);
      applyUserView();
    } else {
      showLoginView();
    }
  } catch (e) {
    showLoginView();
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem("ciftlik_aktif_kullanici");
  showLoginView();
  showToast("Oturum kapatıldı.", "info");
}

function showLoginView() {
  loginView.classList.remove("hidden");
  adminView.classList.add("hidden");
  customerView.classList.add("hidden");
  loginForm.reset();
}

function applyUserView() {
  if (!currentUser) {
    showLoginView();
    return;
  }

  loginView.classList.add("hidden");
  userDisplayName.textContent = currentUser.adSoyad;
  userAvatar.textContent = currentUser.adSoyad.charAt(0).toUpperCase();

  if (currentUser.rol === "admin") {
    // YÖNETİCİ GÖRÜNÜMÜ
    headerSubtitle.textContent = "Yönetici Paneli";
    userRoleTag.textContent = "Yönetici";
    userRoleTag.className = "text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold";
    priceBadgeBtn.classList.remove("hidden");
    adminView.classList.remove("hidden");
    customerView.classList.add("hidden");

    listenToRecords();
    listenToAllCustomerLogs();
  } else {
    // MÜŞTERİ GÖRÜNÜMÜ
    headerSubtitle.textContent = "Müşteri Portalı";
    userRoleTag.textContent = "Müşteri";
    userRoleTag.className = "text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-extrabold";
    priceBadgeBtn.classList.add("hidden"); // Müşteri fiyat düzenleyemez
    adminView.classList.add("hidden");
    customerView.classList.remove("hidden");

    custPortalWelcome.textContent = `Hoş Geldiniz, ${currentUser.adSoyad}!`;
    updateCustomerPortalStats();
    listenToMyCustomerLogs(currentUser.kullaniciAdi);
  }
}

// ============================================================================
// 7. FİYAT AYARI YÖNETİMİ (FIRESTORE)
// ============================================================================
function initSettingsListener() {
  try {
    const docRef = doc(db, COL_SETTINGS, "genel");
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().litreFiyati) {
        currentLitrePrice = Number(docSnap.data().litreFiyati);
      } else {
        // İlk defa çalışıyorsa varsayılan fiyatı Firestore'a yaz
        setDoc(docRef, { litreFiyati: 25.0 }, { merge: true });
      }
      updatePriceUI();
    }, (err) => {
      console.warn("Fiyat ayarı dinleme uyarısı:", err);
      updatePriceUI();
    });
  } catch (e) {
    console.warn("Fiyat başlatılamadı:", e);
    updatePriceUI();
  }
}

function updatePriceUI() {
  const formatted = `${currentLitrePrice.toFixed(2)} ₺`;
  if (navPriceDisplay) navPriceDisplay.textContent = formatted;
  if (quickPriceVal) quickPriceVal.textContent = currentLitrePrice.toFixed(2);
  if (custCurrentPriceBadge) custCurrentPriceBadge.textContent = formatted;
  if (custCardPrice) custCardPrice.textContent = currentLitrePrice.toFixed(2);

  handleLiveCalculation();
  if (currentUser && currentUser.rol === "musteri") {
    handleCustomerLiveCalc();
    updateCustomerPortalStats();
  }
  if (allRecords.length > 0) {
    updateDashboardCards(allRecords);
    renderTable(allRecords);
  }
}

function openPriceModal() {
  priceInput.value = currentLitrePrice;
  priceModal.classList.remove("hidden");
  priceInput.focus();
}

function closePriceModal() {
  priceModal.classList.add("hidden");
}

async function handleSavePrice(e) {
  e.preventDefault();
  const newPrice = parseFloat(priceInput.value);
  if (isNaN(newPrice) || newPrice <= 0) {
    showToast("Lütfen geçerli bir litre fiyatı girin.", "warning");
    return;
  }

  try {
    await setDoc(doc(db, COL_SETTINGS, "genel"), {
      litreFiyati: newPrice,
      guncellendiAt: serverTimestamp()
    }, { merge: true });

    currentLitrePrice = newPrice;
    updatePriceUI();
    closePriceModal();
    showToast(`Süt litre fiyatı ${newPrice.toFixed(2)} ₺ olarak güncellendi!`, "success");
  } catch (err) {
    console.error("Fiyat kaydetme hatası:", err);
    showToast("Fiyat güncellenirken hata oluştu: " + err.message, "error");
  }
}

// ============================================================================
// 8. MÜŞTERİ YÖNETİMİ & KULLANICILAR DİNLENMESİ (ADMIN)
// ============================================================================
function initUsersListener() {
  try {
    const q = query(collection(db, COL_USERS), orderBy("adSoyad", "asc"));
    onSnapshot(q, (snapshot) => {
      allCustomers = [];
      snapshot.forEach(docSnap => {
        allCustomers.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      renderCustomersTable();
      updateCustomerDatalist();
      if (adminCustomerCountBadge) adminCustomerCountBadge.textContent = allCustomers.length;
    });
  } catch (err) {
    console.error("Müşteriler yüklenemedi:", err);
  }
}

function updateCustomerDatalist() {
  if (!customerDatalist) return;
  customerDatalist.innerHTML = "";
  allCustomers.forEach(c => {
    const option = document.createElement("option");
    option.value = c.adSoyad;
    customerDatalist.appendChild(option);
  });
}

async function handleCreateNewCustomer(e) {
  e.preventDefault();
  const adSoyad = newCustName.value.trim();
  const kullaniciAdi = newCustUsername.value.trim().toLowerCase();
  const sifre = newCustPassword.value.trim();
  const telefon = newCustPhone.value.trim();

  if (!adSoyad || !kullaniciAdi || !sifre) {
    showToast("Lütfen Ad Soyad, Kullanıcı Adı ve Şifre alanlarını doldurun.", "warning");
    return;
  }

  // Kullanıcı adı benzersiz mi kontrol et
  if (kullaniciAdi === "admin" || allCustomers.some(c => c.kullaniciAdi.toLowerCase() === kullaniciAdi)) {
    showToast(`"${kullaniciAdi}" kullanıcı adı zaten kullanımda. Farklı bir kullanıcı adı seçin.`, "error");
    newCustUsername.focus();
    return;
  }

  try {
    await addDoc(collection(db, COL_USERS), {
      adSoyad,
      kullaniciAdi,
      sifre,
      telefon,
      rol: "musteri",
      olusturulduAt: serverTimestamp()
    });

    showToast(`"${adSoyad}" isimli müşteri başarıyla tanımlandı!`, "success");
    newCustomerForm.reset();
  } catch (err) {
    console.error("Müşteri oluşturma hatası:", err);
    showToast("Müşteri kaydedilirken hata oluştu: " + err.message, "error");
  }
}

function renderCustomersTable() {
  if (!customersTableBody) return;
  customersTableBody.innerHTML = "";

  if (allCustomers.length === 0) {
    customersEmptyState.classList.remove("hidden");
    return;
  }

  customersEmptyState.classList.add("hidden");

  allCustomers.forEach(cust => {
    // Müşterinin toplam aldığı sütü hesapla
    const custLogs = allCustomerLogs.filter(l => l.musteriKullaniciAdi === cust.kullaniciAdi);
    const totalMilk = custLogs.reduce((acc, l) => acc + (Number(l.miktar) || 0), 0);
    const totalMoney = custLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * currentLitrePrice)), 0);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-4 whitespace-nowrap">
        <div class="font-bold text-slate-900">${escapeHtml(cust.adSoyad)}</div>
        ${cust.telefon ? `<div class="text-[11px] text-slate-400">${escapeHtml(cust.telefon)}</div>` : ""}
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <div class="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg inline-block">
          Kullanıcı: <strong>${escapeHtml(cust.kullaniciAdi)}</strong> &bull; Şifre: <strong>${escapeHtml(cust.sifre)}</strong>
        </div>
      </td>
      <td class="py-3 px-3 whitespace-nowrap font-bold text-slate-800">
        ${totalMilk.toLocaleString("tr-TR")} LT
      </td>
      <td class="py-3 px-3 whitespace-nowrap font-extrabold text-emerald-600">
        ${totalMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
      </td>
      <td class="py-3 px-3 whitespace-nowrap text-right">
        <button 
          data-id="${cust.id}" 
          data-name="${escapeHtml(cust.adSoyad)}"
          class="delete-customer-btn text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
          title="Müşteriyi Sil"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    `;
    customersTableBody.appendChild(tr);
  });

  // Müşteri Silme Butonları
  customersTableBody.querySelectorAll(".delete-customer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm(`"${btn.dataset.name}" isimli müşteriyi ve erişimini silmek istediğinize emin misiniz?`)) {
        deleteDoc(doc(db, COL_USERS, btn.dataset.id))
          .then(() => showToast("Müşteri hesabı silindi.", "info"))
          .catch(err => showToast("Silme hatası: " + err.message, "error"));
      }
    });
  });
}

function switchAdminTab(tab) {
  if (tab === "milk") {
    tabMilkBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 text-white shadow-sm transition flex items-center gap-2";
    tabCustomersBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2";
    adminMilkSection.classList.remove("hidden");
    adminCustomersSection.classList.add("hidden");
  } else {
    tabCustomersBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 text-white shadow-sm transition flex items-center gap-2";
    tabMilkBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2";
    adminMilkSection.classList.add("hidden");
    adminCustomersSection.classList.remove("hidden");
  }
}

// ============================================================================
// 9. ADMIN SÜT TAKİP FORMU & İŞ MANTIĞI
// ============================================================================
function handleAddFormCustomer() {
  const name = customerNameInput.value.trim();
  const amount = parseFloat(customerAmountInput.value);

  if (!name) {
    showToast("Lütfen süt verilen kişinin Adını yazın veya listeden seçin.", "warning");
    customerNameInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast("Lütfen geçerli bir litre miktarı girin.", "warning");
    customerAmountInput.focus();
    return;
  }

  // Sistemde kayıtlı mı kontrol et
  const matched = allCustomers.find(c => c.adSoyad.toLowerCase() === name.toLowerCase());
  const username = matched ? matched.kullaniciAdi : "";
  const tutar = +(amount * currentLitrePrice).toFixed(2);

  formCustomers.push({
    id: "fc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    adSoyad: name,
    miktar: amount,
    tutar: tutar,
    musteriKullaniciAdi: username
  });

  customerNameInput.value = "";
  customerAmountInput.value = "";
  customerNameInput.focus();

  renderFormCustomerList();
  handleLiveCalculation();
}

function handleRemoveFormCustomer(id) {
  formCustomers = formCustomers.filter(c => c.id !== id);
  renderFormCustomerList();
  handleLiveCalculation();
}

function renderFormCustomerList() {
  if (!customerListBox) return;
  const totalHalk = formCustomers.reduce((acc, c) => acc + (Number(c.miktar) || 0), 0);
  const totalMoney = +(totalHalk * currentLitrePrice).toFixed(2);

  if (formCustomers.length === 0) {
    customerListBox.innerHTML = `
      <div id="customer-empty-text" class="text-center py-3 text-xs text-indigo-400 italic bg-white/50 rounded-xl border border-dashed border-indigo-200">
        Henüz kişi eklenmedi
      </div>
    `;
    badgeHalkToplam.textContent = "Toplam: 0 LT (0 ₺)";
    return;
  }

  badgeHalkToplam.textContent = `Toplam: ${totalHalk.toLocaleString("tr-TR")} LT (${totalMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺)`;

  customerListBox.innerHTML = "";
  formCustomers.forEach(cust => {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-indigo-100 shadow-xs text-xs";
    item.innerHTML = `
      <div class="flex items-center gap-2 overflow-hidden">
        <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
          ${cust.adSoyad.charAt(0).toUpperCase()}
        </div>
        <span class="font-semibold text-slate-800 truncate">${escapeHtml(cust.adSoyad)}</span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
          ${Number(cust.miktar).toLocaleString("tr-TR")} LT &bull; ${cust.tutar.toLocaleString("tr-TR")} ₺
        </span>
        <button 
          type="button" 
          data-id="${cust.id}" 
          class="remove-form-cust-btn text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
          title="Kişiyi Çıkar"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    `;
    customerListBox.appendChild(item);
  });

  customerListBox.querySelectorAll(".remove-form-cust-btn").forEach(btn => {
    btn.addEventListener("click", () => handleRemoveFormCustomer(btn.dataset.id));
  });
}

function handleLiveCalculation() {
  const total = parseFloat(totalInput.value) || 0;
  const factory = parseFloat(factoryInput.value) || 0;
  const pub = formCustomers.reduce((acc, c) => acc + (Number(c.miktar) || 0), 0);

  const distributed = +(factory + pub).toFixed(2);
  const remaining = +(total - distributed).toFixed(2);

  const distributedMoney = +(distributed * currentLitrePrice).toFixed(2);
  liveDistributed.textContent = `${distributed.toLocaleString("tr-TR")} LT (${distributedMoney.toLocaleString("tr-TR")} ₺)`;
  liveRemaining.textContent = `${remaining.toLocaleString("tr-TR")} LT`;

  // Kural: Toplam Dağıtılan > Toplanan Toplam Süt Olamaz!
  const isExceeded = total > 0 && distributed > total;

  if (isExceeded) {
    liveBox.className = "p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs transition-colors";
    liveRemaining.className = "font-bold text-rose-600";
    liveAlert.classList.remove("hidden");
    liveBar.className = "bg-rose-500 h-1.5 rounded-full transition-all duration-300";
    liveBar.style.width = "100%";
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    liveBox.className = "p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs transition-colors";
    liveRemaining.className = remaining === 0 ? "font-bold text-slate-700" : "font-bold text-emerald-600";
    liveAlert.classList.add("hidden");
    liveBar.className = "bg-emerald-500 h-1.5 rounded-full transition-all duration-300";
    
    const percentage = total > 0 ? Math.min(100, (distributed / total) * 100) : 0;
    liveBar.style.width = `${percentage}%`;
    submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }

  return { total, factory, pub, distributed, remaining, isExceeded };
}

async function handleAdminFormSubmit(e) {
  e.preventDefault();

  const { total, factory, pub, distributed, remaining, isExceeded } = handleLiveCalculation();

  if (!dateInput.value) {
    showToast("Lütfen bir kayıt tarihi seçin.", "warning");
    dateInput.focus();
    return;
  }

  if (total <= 0) {
    showToast("Lütfen 0'dan büyük bir toplanan süt miktarı girin.", "warning");
    totalInput.focus();
    return;
  }

  if (isExceeded) {
    showToast(
      `Hata: Dağıtılan toplam süt (${distributed} L), toplanan sütü (${total} L) aşamaz!`,
      "error",
      5000
    );
    return;
  }

  submitBtn.disabled = true;
  submitSpinner.classList.remove("hidden");
  submitText.textContent = "Kaydediliyor...";

  try {
    const newRecord = {
      tarih: dateInput.value,
      toplamUretim: total,
      fabrikaSut: factory,
      halkSut: pub,
      halkMusteriler: [...formCustomers],
      kalanSut: remaining,
      litreFiyati: currentLitrePrice,
      toplamTutar: +(total * currentLitrePrice).toFixed(2),
      fabrikaTutar: +(factory * currentLitrePrice).toFixed(2),
      halkTutar: +(pub * currentLitrePrice).toFixed(2),
      not: noteInput.value.trim(),
      olusturulduAt: serverTimestamp()
    };

    // 1. Günlük süt kaydını ekle
    await addDoc(collection(db, COL_RECORDS), newRecord);

    // 2. Eğer kayıtlı müşterilere süt verilmişse, her müşterinin hareketlerine de kaydet
    for (const cust of formCustomers) {
      if (cust.musteriKullaniciAdi) {
        await addDoc(collection(db, COL_CUSTOMER_LOGS), {
          tarih: dateInput.value,
          musteriKullaniciAdi: cust.musteriKullaniciAdi,
          musteriAdSoyad: cust.adSoyad,
          miktar: Number(cust.miktar),
          birimFiyat: currentLitrePrice,
          tutar: Number(cust.tutar),
          not: "Admin tarafından işlendi",
          olusturulduAt: serverTimestamp()
        });
      }
    }

    showToast("Süt kaydı başarıyla sisteme kaydedildi!", "success");

    milkForm.reset();
    formCustomers = [];
    renderFormCustomerList();
    setDefaultDates();
    handleLiveCalculation();

  } catch (error) {
    console.error("Kayıt hatası:", error);
    showToast("Hata oluştu: " + error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitSpinner.classList.add("hidden");
    submitText.textContent = "Kaydı Sisteme Kaydet";
  }
}

// ============================================================================
// 10. FIRESTORE DİNLEYİCİLERİ & TABLOLAR (ADMIN)
// ============================================================================
function listenToRecords() {
  try {
    const q = query(collection(db, COL_RECORDS), orderBy("tarih", "desc"));
    onSnapshot(q, (snapshot) => {
      allRecords = [];
      snapshot.forEach(docSnap => {
        allRecords.push({ id: docSnap.id, ...docSnap.data() });
      });

      updateDashboardCards(allRecords);
      renderTable(allRecords);
    });
  } catch (err) {
    console.error("Kayıt dinleme hatası:", err);
  }
}

function listenToAllCustomerLogs() {
  try {
    const q = query(collection(db, COL_CUSTOMER_LOGS), orderBy("tarih", "desc"));
    onSnapshot(q, (snapshot) => {
      allCustomerLogs = [];
      snapshot.forEach(docSnap => {
        allCustomerLogs.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderCustomersTable();
    });
  } catch (err) {
    console.error("Müşteri logları dinleme hatası:", err);
  }
}

function updateDashboardCards(records) {
  const totals = records.reduce((acc, r) => {
    acc.total += Number(r.toplamUretim) || 0;
    acc.factory += Number(r.fabrikaSut) || 0;
    acc.pub += Number(r.halkSut) || 0;
    acc.remaining += Number(r.kalanSut) || 0;
    return acc;
  }, { total: 0, factory: 0, pub: 0, remaining: 0 });

  statTotal.textContent = totals.total.toLocaleString("tr-TR");
  statTotalMoney.textContent = `${(totals.total * currentLitrePrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ değerinde`;

  statFactory.textContent = totals.factory.toLocaleString("tr-TR");
  statFactoryMoney.textContent = `${(totals.factory * currentLitrePrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ kazanç`;

  statPublic.textContent = totals.pub.toLocaleString("tr-TR");
  statPublicMoney.textContent = `${(totals.pub * currentLitrePrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ alacak`;

  statRemaining.textContent = totals.remaining.toLocaleString("tr-TR");
}

function renderTable(records) {
  recordsTableBody.innerHTML = "";

  if (!records || records.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  records.forEach((record) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50/80 transition-colors group";

    let dateStr = record.tarih;
    try {
      const parts = record.tarih.split("-");
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        dateStr = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) {
      dateStr = record.tarih;
    }

    const musteriler = record.halkMusteriler || [];
    const musteriSayisi = musteriler.length;
    const price = record.litreFiyati || currentLitrePrice;

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <span>${dateStr}</span>
          ${record.not ? `<span class="inline-block w-2 h-2 rounded-full bg-blue-400" title="${escapeHtml(record.not)}"></span>` : ""}
        </div>
      </td>
      <td class="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
        ${Number(record.toplamUretim).toLocaleString("tr-TR")} LT
        <div class="text-[10px] text-slate-400 font-semibold">${(Number(record.toplamUretim) * price).toLocaleString("tr-TR")} ₺</div>
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          ${Number(record.fabrikaSut || 0).toLocaleString("tr-TR")} LT
        </span>
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            ${Number(record.halkSut || 0).toLocaleString("tr-TR")} LT
          </span>
          ${musteriSayisi > 0 ? `
            <button 
              data-id="${record.id}" 
              class="view-customers-btn text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
              title="Kişileri Görüntüle"
            >
              <span>${musteriSayisi} Kişi</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ` : ""}
        </div>
      </td>
      <td class="py-3 px-3 font-semibold text-amber-700 whitespace-nowrap">
        ${Number(record.kalanSut || 0).toLocaleString("tr-TR")} LT
      </td>
      <td class="py-3 px-3 text-right whitespace-nowrap">
        <button 
          data-id="${record.id}" 
          data-date="${dateStr}"
          class="delete-btn text-slate-300 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50"
          title="Kaydı Sil"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    `;
    recordsTableBody.appendChild(tr);
  });

  recordsTableBody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => openDeleteModal(btn.dataset.id, btn.dataset.date));
  });

  recordsTableBody.querySelectorAll(".view-customers-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const rec = records.find(r => r.id === btn.dataset.id);
      if (rec) openCustomerModal(rec);
    });
  });
}

function filterRecords(term) {
  if (!term) {
    renderTable(allRecords);
    return;
  }
  const filtered = allRecords.filter(r => 
    (r.tarih && r.tarih.includes(term)) || 
    (r.not && r.not.toLowerCase().includes(term)) ||
    ((r.halkMusteriler || []).some(m => m.adSoyad && m.adSoyad.toLowerCase().includes(term)))
  );
  renderTable(filtered);
}

// ============================================================================
// 11. MÜŞTERİ PORTALI İŞLEMLERİ (CUSTOMER VIEW)
// ============================================================================
let myCustomerLogs = [];

function listenToMyCustomerLogs(username) {
  try {
    const q = query(
      collection(db, COL_CUSTOMER_LOGS),
      where("musteriKullaniciAdi", "==", username)
    );

    onSnapshot(q, (snapshot) => {
      myCustomerLogs = [];
      snapshot.forEach(docSnap => {
        myCustomerLogs.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Tarihe göre sırala
      myCustomerLogs.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
      updateCustomerPortalStats();
      renderCustomerPortalTable();
    });
  } catch (err) {
    console.error("Müşteri kendi kayıtları dinleme hatası:", err);
  }
}

function handleCustomerLiveCalc() {
  const amount = parseFloat(custInputAmount.value) || 0;
  const total = +(amount * currentLitrePrice).toFixed(2);
  custLiveCalcTotal.textContent = `${total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
}

async function handleCustomerFormSubmit(e) {
  e.preventDefault();
  const dateVal = custInputDate.value;
  const amount = parseFloat(custInputAmount.value);
  const note = custInputNote.value.trim();

  if (!dateVal) {
    showToast("Lütfen tarih seçin.", "warning");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast("Lütfen aldığınız süt miktarını girin.", "warning");
    custInputAmount.focus();
    return;
  }

  const tutar = +(amount * currentLitrePrice).toFixed(2);

  try {
    // 1. Müşteri loguna ekle
    await addDoc(collection(db, COL_CUSTOMER_LOGS), {
      tarih: dateVal,
      musteriKullaniciAdi: currentUser.kullaniciAdi,
      musteriAdSoyad: currentUser.adSoyad,
      miktar: amount,
      birimFiyat: currentLitrePrice,
      tutar: tutar,
      not: note || "Müşteri girişi",
      olusturulduAt: serverTimestamp()
    });

    showToast("Süt alımınız başarıyla kaydedildi!", "success");
    custMilkForm.reset();
    setDefaultDates();
    handleCustomerLiveCalc();
  } catch (err) {
    console.error("Müşteri kayıt hatası:", err);
    showToast("Kayıt eklenirken hata: " + err.message, "error");
  }
}

function updateCustomerPortalStats() {
  const totalMilk = myCustomerLogs.reduce((acc, l) => acc + (Number(l.miktar) || 0), 0);
  const totalMoney = myCustomerLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * currentLitrePrice)), 0);

  if (custTotalMilk) custTotalMilk.textContent = totalMilk.toLocaleString("tr-TR");
  if (custTotalMoney) custTotalMoney.textContent = totalMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  if (custTotalRecordsCount) custTotalRecordsCount.textContent = `${myCustomerLogs.length} alım kaydı`;
}

function renderCustomerPortalTable() {
  if (!custRecordsTableBody) return;
  custRecordsTableBody.innerHTML = "";

  if (myCustomerLogs.length === 0) {
    custEmptyState.classList.remove("hidden");
    return;
  }

  custEmptyState.classList.add("hidden");

  myCustomerLogs.forEach(log => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-colors";

    let dateStr = log.tarih;
    try {
      const parts = log.tarih.split("-");
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        dateStr = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) {
      dateStr = log.tarih;
    }

    const price = log.birimFiyat || currentLitrePrice;
    const tutar = log.tutar || (Number(log.miktar) * price);

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">${dateStr}</td>
      <td class="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">${Number(log.miktar).toLocaleString("tr-TR")} LT</td>
      <td class="py-3 px-3 whitespace-nowrap text-xs text-slate-500">${price.toFixed(2)} ₺ / LT</td>
      <td class="py-3 px-3 font-extrabold text-emerald-600 whitespace-nowrap">${tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
      <td class="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">${escapeHtml(log.not || "-")}</td>
    `;
    custRecordsTableBody.appendChild(tr);
  });
}

// ============================================================================
// 12. MODAL YÖNETİMİ
// ============================================================================
function openCustomerModal(record) {
  if (!customerDetailModal) return;

  let dateStr = record.tarih;
  try {
    const parts = record.tarih.split("-");
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      dateStr = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    }
  } catch (e) {
    dateStr = record.tarih;
  }

  const musteriler = record.halkMusteriler || [];
  const price = record.litreFiyati || currentLitrePrice;
  const totalHalk = Number(record.halkSut || 0);
  const totalMoney = +(totalHalk * price).toFixed(2);

  customerModalSubtitle.textContent = `${dateStr} Tarihli Satış Dökümü (Litre Fiyatı: ${price.toFixed(2)} ₺)`;
  customerModalTotal.textContent = `${totalHalk.toLocaleString("tr-TR")} LT (${totalMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺)`;

  customerModalList.innerHTML = "";

  if (musteriler.length === 0) {
    customerModalList.innerHTML = `<div class="text-center py-6 text-xs text-slate-400">Bu kayıt için detaylı kişi kaydı bulunmuyor.</div>`;
  } else {
    musteriler.forEach((m) => {
      const mTutar = m.tutar || (Number(m.miktar) * price);
      const div = document.createElement("div");
      div.className = "flex items-center justify-between py-2.5 px-2";
      div.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
            ${m.adSoyad ? m.adSoyad.charAt(0).toUpperCase() : "?"}
          </div>
          <span class="text-xs font-semibold text-slate-800">${escapeHtml(m.adSoyad)}</span>
        </div>
        <span class="text-xs font-bold text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100">
          ${Number(m.miktar).toLocaleString("tr-TR")} LT &bull; ${mTutar.toLocaleString("tr-TR")} ₺
        </span>
      `;
      customerModalList.appendChild(div);
    });
  }

  customerDetailModal.classList.remove("hidden");
}

function closeCustomerModal() {
  if (customerDetailModal) customerDetailModal.classList.add("hidden");
}

function openDeleteModal(id, dateText) {
  recordToDeleteId = id;
  deleteModalText.textContent = `${dateText} tarihli süt kaydını kalıcı olarak silmek istediğinizden emin misiniz?`;
  deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  recordToDeleteId = null;
  deleteModal.classList.add("hidden");
}

async function executeDelete() {
  if (!recordToDeleteId) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Siliniyor...";

  try {
    await deleteDoc(doc(db, COL_RECORDS, recordToDeleteId));
    showToast("Kayıt başarıyla silindi.", "info");
    closeDeleteModal();
  } catch (err) {
    console.error("Silme hatası:", err);
    showToast("Kayıt silinirken hata: " + err.message, "error");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Evet, Sil";
  }
}

// ============================================================================
// 13. TOAST BİLDİRİM FONKSİYONU
// ============================================================================
function showToast(message, type = 'info', duration = 4000) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  const types = {
    success: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: `<svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`
    },
    warning: {
      bg: 'bg-amber-50 text-amber-900 border-amber-300',
      icon: `<svg class="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`
    },
    error: {
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      icon: `<svg class="w-5 h-5 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`
    },
    info: {
      bg: 'bg-blue-50 text-blue-800 border-blue-300',
      icon: `<svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
    }
  };

  const current = types[type] || types.info;

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-2 opacity-0 text-sm font-medium ${current.bg}`;
  toast.innerHTML = `
    ${current.icon}
    <div class="flex-1 leading-snug">${escapeHtml(message)}</div>
    <button class="text-gray-400 hover:text-gray-700 transition p-1" onclick="this.parentElement.remove()">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
