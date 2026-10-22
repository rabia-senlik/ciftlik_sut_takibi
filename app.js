// ============================================================================
// ÇİFTLİK SÜT YÖNETİM SİSTEMİ - APP.JS
// Toplanan Süt, Fabrika Satışı, Halka Ödenecek Para Hesabı & E-posta Raporlama
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
// 1. FIREBASE YAPILANDIRMASI
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Koleksiyonlar
const COL_RECORDS = "sut_kayitlari";
const COL_USERS = "kullanicilar";
const COL_SETTINGS = "ayarlar";
const COL_CUSTOMER_LOGS = "musteri_islemleri";

// ============================================================================
// 2. GLOBAL DURUM (STATE)
// ============================================================================
let currentUser = null; // { kullaniciAdi, adSoyad, rol, id, email }
let loginMode = "admin"; // "admin" veya "customer"
let factoryPrice = 28.0; // Fabrikaya Satış Litre Fiyatı (TL)
let publicPrice = 23.0;  // Halka Ödenecek / Köylüden Alış Litre Fiyatı (TL)

let allRecords = [];
let allCustomers = [];
let allCustomerLogs = [];
let formProducers = []; // O gün süt teslim eden köylüler/müşteriler: [{ adSoyad, miktar, tutar, musteriKullaniciAdi }]
let recordToDeleteId = null;

// ============================================================================
// 3. DOM ELEMENTLERİ
// ============================================================================
// Görünümler
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const customerView = document.getElementById("customer-view");

// Giriş Sekmeleri & Formu
const loginTabAdmin = document.getElementById("login-tab-admin");
const loginTabCustomer = document.getElementById("login-tab-customer");
const loginForm = document.getElementById("login-form");
const loginUsernameInput = document.getElementById("login-username");
const loginPasswordInput = document.getElementById("login-password");
const loginUsernameLabel = document.getElementById("login-username-label");
const loginBtnText = document.getElementById("login-btn-text");
const loginHintBox = document.getElementById("login-hint-box");

// Navbar
const headerSubtitle = document.getElementById("header-subtitle");
const userDisplayName = document.getElementById("user-display-name");
const userRoleTag = document.getElementById("user-role-tag");
const userAvatar = document.getElementById("user-avatar");
const logoutBtn = document.getElementById("logout-btn");
const toastContainer = document.getElementById("toast-container");
const navFactoryPriceDisplay = document.getElementById("nav-factory-price-display");
const navPublicPriceDisplay = document.getElementById("nav-public-price-display");
const emailReportBtn = document.getElementById("email-report-btn");

// Admin Sekmeleri & Bölümleri
const tabMilkBtn = document.getElementById("tab-milk-btn");
const tabCustomersBtn = document.getElementById("tab-customers-btn");
const adminMilkSection = document.getElementById("admin-milk-section");
const adminCustomersSection = document.getElementById("admin-customers-section");
const adminCustomerCountBadge = document.getElementById("admin-customer-count-badge");
const quickChangePriceBtn = document.getElementById("quick-change-price-btn");

// Admin Süt Formu
const milkForm = document.getElementById("milk-form");
const dateInput = document.getElementById("input-date");
const totalInput = document.getElementById("input-total");
const factoryInput = document.getElementById("input-factory");
const factoryPriceInput = document.getElementById("input-factory-price");
const liveFactoryCalc = document.getElementById("live-factory-calc");
const publicPriceInput = document.getElementById("input-public-price");
const customerNameInput = document.getElementById("customer-name");
const customerDatalist = document.getElementById("customer-datalist");
const customerAmountInput = document.getElementById("customer-amount");
const addCustomerBtn = document.getElementById("add-customer-btn");
const customerListBox = document.getElementById("customer-list-box");
const badgeHalkBorc = document.getElementById("badge-halk-borc");
const noteInput = document.getElementById("input-note");
const submitBtn = document.getElementById("submit-btn");
const submitText = document.getElementById("submit-text");
const submitSpinner = document.getElementById("submit-spinner");
const resetBtn = document.getElementById("reset-btn");

// Admin Canlı Hesaplama
const liveIncome = document.getElementById("live-income");
const liveExpense = document.getElementById("live-expense");
const liveProfit = document.getElementById("live-profit");

// Admin İstatistik Kartları
const statTotal = document.getElementById("stat-total");
const statCount = document.getElementById("stat-count");
const statFactory = document.getElementById("stat-factory");
const statFactoryMoney = document.getElementById("stat-factory-money");
const statPublicMoney = document.getElementById("stat-public-money");
const statPublicMilkTotal = document.getElementById("stat-public-milk-total");
const statNetProfit = document.getElementById("stat-net-profit");

// Admin Tablo & Arama
const recordsTableBody = document.getElementById("records-table-body");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");

// Admin Müşteri Yönetimi
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
const priceFactoryInput = document.getElementById("price-factory-input");
const pricePublicInput = document.getElementById("price-public-input");
const closePriceModalBtn = document.getElementById("close-price-modal-btn");
const cancelPriceBtn = document.getElementById("cancel-price-btn");

const emailModal = document.getElementById("email-modal");
const emailReportForm = document.getElementById("email-report-form");
const reportEmailInput = document.getElementById("report-email-input");
const closeEmailModalBtn = document.getElementById("close-email-modal-btn");
const printReportBtn = document.getElementById("print-report-btn");
const previewReportTitle = document.getElementById("preview-report-title");
const previewReportDate = document.getElementById("preview-report-date");
const previewTotalMilk = document.getElementById("preview-total-milk");
const previewFactoryMoney = document.getElementById("preview-factory-money");
const previewPublicMoney = document.getElementById("preview-public-money");
const previewNetProfit = document.getElementById("preview-net-profit");

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
// 5. ETKİNLİK DİNLEYİCİLERİ
// ============================================================================
function setupEventListeners() {
  // Giriş Sekmeleri Değişimi (Admin vs Müşteri)
  loginTabAdmin.addEventListener("click", () => switchLoginTab("admin"));
  loginTabCustomer.addEventListener("click", () => switchLoginTab("customer"));

  // Giriş Formu
  loginForm.addEventListener("submit", handleLogin);

  // Çıkış
  logoutBtn.addEventListener("click", handleLogout);

  // Admin Sekmeleri
  tabMilkBtn.addEventListener("click", () => switchAdminTab("milk"));
  tabCustomersBtn.addEventListener("click", () => switchAdminTab("customers"));

  // Fiyat Modalı
  quickChangePriceBtn.addEventListener("click", openPriceModal);
  closePriceModalBtn.addEventListener("click", closePriceModal);
  cancelPriceBtn.addEventListener("click", closePriceModal);
  priceForm.addEventListener("submit", handleSavePrices);

  // E-posta Rapor Modalı
  if (emailReportBtn) emailReportBtn.addEventListener("click", openEmailModal);
  if (closeEmailModalBtn) closeEmailModalBtn.addEventListener("click", closeEmailModal);
  if (emailReportForm) emailReportForm.addEventListener("submit", handleSendEmailReport);
  if (printReportBtn) printReportBtn.addEventListener("click", () => window.print());

  // Rapor sıklığı değiştikçe önizlemeyi güncelle
  document.querySelectorAll('input[name="reportFrequency"]').forEach(radio => {
    radio.addEventListener("change", updateReportPreview);
  });

  // Admin Süt Formu Canlı Hesaplamaları
  [totalInput, factoryInput, factoryPriceInput, publicPriceInput].forEach(inp => {
    if (inp) inp.addEventListener("input", handleLiveCalculation);
  });

  // Admin Üretici Ekleme
  if (addCustomerBtn) addCustomerBtn.addEventListener("click", handleAddFormProducer);
  [customerNameInput, customerAmountInput].forEach(inp => {
    if (inp) {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddFormProducer();
        }
      });
    }
  });

  // Admin Süt Formu Gönderme & Temizleme
  milkForm.addEventListener("submit", handleAdminFormSubmit);
  resetBtn.addEventListener("click", () => {
    milkForm.reset();
    formProducers = [];
    renderFormProducerList();
    setDefaultDates();
    factoryPriceInput.value = factoryPrice;
    publicPriceInput.value = publicPrice;
    handleLiveCalculation();
  });

  // Admin Tablo Arama
  searchInput.addEventListener("input", (e) => {
    filterRecords(e.target.value.toLowerCase().trim());
  });

  // Admin Yeni Müşteri/Üretici Ekleme Formu
  newCustomerForm.addEventListener("submit", handleCreateNewCustomer);

  // Müşteri Portalı Canlı Hesaplama & Form
  if (custInputAmount) custInputAmount.addEventListener("input", handleCustomerLiveCalc);
  if (custMilkForm) custMilkForm.addEventListener("submit", handleCustomerFormSubmit);

  // Silme Modalı
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", executeDelete);
}

// ============================================================================
// 6. GİRİŞ EKRANI SEKMELERİ & OTURUM YÖNETİMİ
// ============================================================================
function switchLoginTab(mode) {
  loginMode = mode;
  loginForm.reset();

  if (mode === "admin") {
    loginTabAdmin.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-emerald-800 shadow-xs transition flex items-center justify-center gap-1.5";
    loginTabCustomer.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5";
    loginUsernameLabel.textContent = "Yönetici E-posta veya Kullanıcı Adı";
    loginUsernameInput.placeholder = "Örn: admin veya admin@ciftlik.com";
    loginBtnText.textContent = "Yönetici Olarak Giriş Yap";
    loginHintBox.innerHTML = `
      <p class="text-xs text-emerald-800 font-medium">
        🔑 <strong>Admin Giriş:</strong> <code class="font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">admin</code> veya e-postanız &bull; Şifre: <code class="font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">123</code>
      </p>
    `;
  } else {
    loginTabCustomer.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-indigo-800 shadow-xs transition flex items-center justify-center gap-1.5";
    loginTabAdmin.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5";
    loginUsernameLabel.textContent = "Müşteri / Üretici Kullanıcı Adı";
    loginUsernameInput.placeholder = "Örn: ahmet veya ahmet@gmail.com";
    loginBtnText.textContent = "Müşteri / Üretici Olarak Giriş Yap";
    loginHintBox.innerHTML = `
      <p class="text-xs text-indigo-800 font-medium">
        👤 <strong>Müşteri Girişi:</strong> Çiftlik yöneticisinin sizin için oluşturduğu kullanıcı adı veya e-posta ve şifrenizle giriş yapabilirsiniz.
      </p>
    `;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = loginUsernameInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value.trim();

  if (!username || !password) {
    showToast("Lütfen kullanıcı adı / e-posta ve şifrenizi girin.", "warning");
    return;
  }

  // 1. Admin Girişi (admin / 123 veya e-posta kontrolü)
  if (loginMode === "admin") {
    if ((username === "admin" || username.includes("admin") || username.includes("@")) && password === "123") {
      const adminUser = {
        id: "admin_root",
        kullaniciAdi: username,
        email: username.includes("@") ? username : "admin@ciftlik.com",
        adSoyad: "Çiftlik Yöneticisi",
        rol: "admin"
      };
      setSession(adminUser);
      showToast("Yönetici girişi başarılı!", "success");
      return;
    } else {
      showToast("Hatalı yönetici bilgisi girdiniz!", "error");
      return;
    }
  }

  // 2. Müşteri Girişi (Koleksiyondan eşleştir)
  const matchedCustomer = allCustomers.find(c => 
    (c.kullaniciAdi.toLowerCase() === username || (c.email && c.email.toLowerCase() === username)) && 
    c.sifre === password
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

  showToast("Müşteri bulunamadı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.", "error");
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
  switchLoginTab("admin");
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
    // YÖNETİCİ PANELİ
    headerSubtitle.textContent = "Yönetici Paneli";
    userRoleTag.textContent = "Yönetici";
    userRoleTag.className = "text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold";
    if (emailReportBtn) emailReportBtn.classList.remove("hidden");
    adminView.classList.remove("hidden");
    customerView.classList.add("hidden");

    // Form fiyat kutularına varsayılanları koy
    if (factoryPriceInput) factoryPriceInput.value = factoryPrice;
    if (publicPriceInput) publicPriceInput.value = publicPrice;

    listenToRecords();
    listenToAllCustomerLogs();
  } else {
    // MÜŞTERİ PORTALI
    headerSubtitle.textContent = "Müşteri / Üretici Portalı";
    userRoleTag.textContent = "Üretici";
    userRoleTag.className = "text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-extrabold";
    if (emailReportBtn) emailReportBtn.classList.add("hidden");
    adminView.classList.add("hidden");
    customerView.classList.remove("hidden");

    custPortalWelcome.textContent = `Hoş Geldiniz, ${currentUser.adSoyad}!`;
    updateCustomerPortalStats();
    listenToMyCustomerLogs(currentUser.kullaniciAdi);
  }
}

// ============================================================================
// 7. FİYAT AYARLARI (FABRİKA SATIŞ & HALK ALIŞ FİYATLARI)
// ============================================================================
function initSettingsListener() {
  try {
    const docRef = doc(db, COL_SETTINGS, "fiyatlar");
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.fabrikaFiyati) factoryPrice = Number(d.fabrikaFiyati);
        if (d.halkAlisFiyati) publicPrice = Number(d.halkAlisFiyati);
      } else {
        setDoc(docRef, { fabrikaFiyati: 28.0, halkAlisFiyati: 23.0 }, { merge: true });
      }
      updatePriceDisplays();
    });
  } catch (e) {
    console.warn("Fiyat ayarı yüklenemedi:", e);
    updatePriceDisplays();
  }
}

function updatePriceDisplays() {
  if (navFactoryPriceDisplay) navFactoryPriceDisplay.textContent = `${factoryPrice.toFixed(2)} ₺`;
  if (navPublicPriceDisplay) navPublicPriceDisplay.textContent = `${publicPrice.toFixed(2)} ₺`;
  if (custCurrentPriceBadge) custCurrentPriceBadge.textContent = `${publicPrice.toFixed(2)} ₺`;
  if (custCardPrice) custCardPrice.textContent = publicPrice.toFixed(2);

  if (factoryPriceInput && !factoryPriceInput.value) factoryPriceInput.value = factoryPrice;
  if (publicPriceInput && !publicPriceInput.value) publicPriceInput.value = publicPrice;

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
  priceFactoryInput.value = factoryPrice;
  pricePublicInput.value = publicPrice;
  priceModal.classList.remove("hidden");
  priceFactoryInput.focus();
}

function closePriceModal() {
  priceModal.classList.add("hidden");
}

async function handleSavePrices(e) {
  e.preventDefault();
  const fPrice = parseFloat(priceFactoryInput.value);
  const pPrice = parseFloat(pricePublicInput.value);

  if (isNaN(fPrice) || fPrice <= 0 || isNaN(pPrice) || pPrice <= 0) {
    showToast("Lütfen geçerli fiyat değerleri girin.", "warning");
    return;
  }

  try {
    await setDoc(doc(db, COL_SETTINGS, "fiyatlar"), {
      fabrikaFiyati: fPrice,
      halkAlisFiyati: pPrice,
      guncellendiAt: serverTimestamp()
    }, { merge: true });

    factoryPrice = fPrice;
    publicPrice = pPrice;
    updatePriceDisplays();
    closePriceModal();
    showToast("Fiyat tarifesi başarıyla güncellendi!", "success");
  } catch (err) {
    showToast("Fiyat kaydedilirken hata: " + err.message, "error");
  }
}

// ============================================================================
// 8. ADMİN SÜT & FABRİKA FORMU HESAPLAMALARI
// ============================================================================
function handleAddFormProducer() {
  const name = customerNameInput.value.trim();
  const amount = parseFloat(customerAmountInput.value);
  const pPrice = parseFloat(publicPriceInput.value) || publicPrice;

  if (!name) {
    showToast("Lütfen süt teslim eden kişinin Adını girin veya seçin.", "warning");
    customerNameInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast("Lütfen geçerli bir litre girin.", "warning");
    customerAmountInput.focus();
    return;
  }

  const matched = allCustomers.find(c => c.adSoyad.toLowerCase() === name.toLowerCase());
  const username = matched ? matched.kullaniciAdi : "";
  const tutar = +(amount * pPrice).toFixed(2);

  formProducers.push({
    id: "fp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    adSoyad: name,
    miktar: amount,
    birimFiyat: pPrice,
    tutar: tutar,
    musteriKullaniciAdi: username
  });

  customerNameInput.value = "";
  customerAmountInput.value = "";
  customerNameInput.focus();

  renderFormProducerList();
  handleLiveCalculation();
}

function handleRemoveFormProducer(id) {
  formProducers = formProducers.filter(p => p.id !== id);
  renderFormProducerList();
  handleLiveCalculation();
}

function renderFormProducerList() {
  if (!customerListBox) return;
  const totalHalkSut = formProducers.reduce((acc, p) => acc + (Number(p.miktar) || 0), 0);
  const totalHalkBorc = formProducers.reduce((acc, p) => acc + (Number(p.tutar) || 0), 0);

  if (formProducers.length === 0) {
    customerListBox.innerHTML = `
      <div id="customer-empty-text" class="text-center py-2 text-xs text-amber-500 italic bg-white/50 rounded-xl border border-dashed border-amber-200">
        Henüz üretici eklenmedi
      </div>
    `;
    badgeHalkBorc.textContent = "Halka: 0.00 ₺";
    return;
  }

  badgeHalkBorc.textContent = `Halka: ${totalHalkBorc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ (${totalHalkSut} LT)`;

  customerListBox.innerHTML = "";
  formProducers.forEach(prod => {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-amber-100 shadow-xs text-xs";
    item.innerHTML = `
      <div class="flex items-center gap-2 overflow-hidden">
        <div class="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
          ${prod.adSoyad.charAt(0).toUpperCase()}
        </div>
        <span class="font-semibold text-slate-800 truncate">${escapeHtml(prod.adSoyad)}</span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
          ${Number(prod.miktar).toLocaleString("tr-TR")} LT &bull; ${prod.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
        </span>
        <button 
          type="button" 
          data-id="${prod.id}" 
          class="remove-prod-btn text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
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

  customerListBox.querySelectorAll(".remove-prod-btn").forEach(btn => {
    btn.addEventListener("click", () => handleRemoveFormProducer(btn.dataset.id));
  });
}

function handleLiveCalculation() {
  const totalProduced = parseFloat(totalInput.value) || 0;
  const factoryMilk = parseFloat(factoryInput.value) || 0;
  const fPrice = parseFloat(factoryPriceInput.value) || factoryPrice;
  const pPrice = parseFloat(publicPriceInput.value) || publicPrice;

  // Fabrika Geliri = Fabrikaya Verilen Süt * Fabrika Fiyatı
  const factoryIncome = +(factoryMilk * fPrice).toFixed(2);
  liveFactoryCalc.textContent = `${factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

  // Halka Ödenecek Para = Eklenen üreticilerin tutarları toplamı
  const totalPublicExpense = +(formProducers.reduce((acc, p) => acc + (Number(p.tutar) || 0), 0)).toFixed(2);

  // Çiftlik Net Kârı = Fabrika Geliri - Halka Ödenecek Para
  const netProfit = +(factoryIncome - totalPublicExpense).toFixed(2);

  liveIncome.textContent = `${factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  liveExpense.textContent = `${totalPublicExpense.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  liveProfit.textContent = `${netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

  return { totalProduced, factoryMilk, fPrice, pPrice, factoryIncome, totalPublicExpense, netProfit };
}

async function handleAdminFormSubmit(e) {
  e.preventDefault();
  const { totalProduced, factoryMilk, fPrice, pPrice, factoryIncome, totalPublicExpense, netProfit } = handleLiveCalculation();

  if (!dateInput.value) {
    showToast("Lütfen kayıt tarihini seçin.", "warning");
    dateInput.focus();
    return;
  }

  if (totalProduced <= 0) {
    showToast("Lütfen toplanan toplam süt miktarını girin.", "warning");
    totalInput.focus();
    return;
  }

  submitBtn.disabled = true;
  submitSpinner.classList.remove("hidden");
  submitText.textContent = "Kaydediliyor...";

  try {
    const recordPayload = {
      tarih: dateInput.value,
      toplamUretim: totalProduced,
      toplananSut: totalProduced, // Toplanan süt otomatik toplam üretimdir
      fabrikaSut: factoryMilk,
      fabrikaFiyat: fPrice,
      fabrikaGelir: factoryIncome,
      halkAlisFiyat: pPrice,
      halkaOdenecekPara: totalPublicExpense,
      netKar: netProfit,
      halkUreticiler: [...formProducers],
      not: noteInput.value.trim(),
      olusturulduAt: serverTimestamp()
    };

    // 1. Günlük süt kaydını Firestore'a ekle
    await addDoc(collection(db, COL_RECORDS), recordPayload);

    // 2. Müşteri loglarını Firestore'a işle
    for (const prod of formProducers) {
      if (prod.musteriKullaniciAdi) {
        await addDoc(collection(db, COL_CUSTOMER_LOGS), {
          tarih: dateInput.value,
          musteriKullaniciAdi: prod.musteriKullaniciAdi,
          musteriAdSoyad: prod.adSoyad,
          miktar: Number(prod.miktar),
          birimFiyat: Number(prod.birimFiyat || pPrice),
          tutar: Number(prod.tutar),
          not: "Admin tarafından kaydedildi",
          olusturulduAt: serverTimestamp()
        });
      }
    }

    showToast("Günlük kayıt ve hesaplamalar başarıyla kaydedildi!", "success");

    milkForm.reset();
    formProducers = [];
    renderFormProducerList();
    setDefaultDates();
    factoryPriceInput.value = factoryPrice;
    publicPriceInput.value = publicPrice;
    handleLiveCalculation();

  } catch (err) {
    console.error("Kayıt hatası:", err);
    showToast("Kayıt eklenirken hata: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitSpinner.classList.add("hidden");
    submitText.textContent = "Günü Sisteme Kaydet";
  }
}

// ============================================================================
// 9. ADMİN TABLO & KART LİSTESİ
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
    console.error("Kayıtlar dinlenemedi:", err);
  }
}

function updateDashboardCards(records) {
  const totals = records.reduce((acc, r) => {
    acc.total += Number(r.toplamUretim || r.toplananSut) || 0;
    acc.factoryMilk += Number(r.fabrikaSut) || 0;
    acc.factoryIncome += Number(r.fabrikaGelir || (Number(r.fabrikaSut) * (r.fabrikaFiyat || factoryPrice))) || 0;
    acc.publicExpense += Number(r.halkaOdenecekPara) || 0;
    acc.netProfit += Number(r.netKar || (acc.factoryIncome - acc.publicExpense)) || 0;
    return acc;
  }, { total: 0, factoryMilk: 0, factoryIncome: 0, publicExpense: 0, netProfit: 0 });

  statTotal.textContent = totals.total.toLocaleString("tr-TR");
  statCount.textContent = `${records.length} günlük kayıt`;

  statFactory.textContent = totals.factoryMilk.toLocaleString("tr-TR");
  statFactoryMoney.textContent = `${totals.factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ Alacak / Gelir`;

  statPublicMoney.textContent = totals.publicExpense.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  statNetProfit.textContent = totals.netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
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

    const fGelir = Number(record.fabrikaGelir || (Number(record.fabrikaSut || 0) * (record.fabrikaFiyat || factoryPrice)));
    const hBorc = Number(record.halkaOdenecekPara || 0);
    const nKar = Number(record.netKar || (fGelir - hBorc));

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <span>${dateStr}</span>
          ${record.not ? `<span class="inline-block w-2 h-2 rounded-full bg-blue-400" title="${escapeHtml(record.not)}"></span>` : ""}
        </div>
      </td>
      <td class="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
        ${Number(record.toplamUretim || record.toplananSut || 0).toLocaleString("tr-TR")} LT
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <div class="font-bold text-emerald-700">${Number(record.fabrikaSut || 0).toLocaleString("tr-TR")} LT</div>
        <div class="text-[11px] text-emerald-600 font-extrabold">${fGelir.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
          ${hBorc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
        </span>
      </td>
      <td class="py-3 px-3 font-extrabold text-indigo-700 whitespace-nowrap">
        ${nKar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
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
}

function filterRecords(term) {
  if (!term) {
    renderTable(allRecords);
    return;
  }
  const filtered = allRecords.filter(r => 
    (r.tarih && r.tarih.includes(term)) || 
    (r.not && r.not.toLowerCase().includes(term))
  );
  renderTable(filtered);
}

// ============================================================================
// 10. MÜŞTERİ YÖNETİMİ & KULLANICI İŞLEMLERİ
// ============================================================================
function initUsersListener() {
  try {
    const q = query(collection(db, COL_USERS), orderBy("adSoyad", "asc"));
    onSnapshot(q, (snapshot) => {
      allCustomers = [];
      snapshot.forEach(docSnap => {
        allCustomers.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderCustomersTable();
      updateCustomerDatalist();
      if (adminCustomerCountBadge) adminCustomerCountBadge.textContent = allCustomers.length;
    });
  } catch (err) {
    console.error("Müşteriler dinlenemedi:", err);
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

  if (kullaniciAdi === "admin" || allCustomers.some(c => c.kullaniciAdi.toLowerCase() === kullaniciAdi)) {
    showToast(`"${kullaniciAdi}" kullanıcı adı zaten kayıtlı. Başka bir isim belirleyin.`, "error");
    newCustUsername.focus();
    return;
  }

  try {
    await addDoc(collection(db, COL_USERS), {
      adSoyad,
      kullaniciAdi,
      email: kullaniciAdi.includes("@") ? kullaniciAdi : "",
      sifre,
      telefon,
      rol: "musteri",
      olusturulduAt: serverTimestamp()
    });

    showToast(`"${adSoyad}" başarıyla müşteri/üretici olarak eklendi!`, "success");
    newCustomerForm.reset();
  } catch (err) {
    showToast("Müşteri kaydedilirken hata: " + err.message, "error");
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
    const custLogs = allCustomerLogs.filter(l => l.musteriKullaniciAdi === cust.kullaniciAdi);
    const totalMilk = custLogs.reduce((acc, l) => acc + (Number(l.miktar) || 0), 0);
    const totalOdenen = custLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-4 whitespace-nowrap">
        <div class="font-bold text-slate-900">${escapeHtml(cust.adSoyad)}</div>
        ${cust.telefon ? `<div class="text-[11px] text-slate-400">${escapeHtml(cust.telefon)}</div>` : ""}
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <div class="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg inline-block">
          Giriş: <strong>${escapeHtml(cust.kullaniciAdi)}</strong> &bull; Şifre: <strong>${escapeHtml(cust.sifre)}</strong>
        </div>
      </td>
      <td class="py-3 px-3 whitespace-nowrap font-bold text-slate-800">
        ${totalMilk.toLocaleString("tr-TR")} LT
      </td>
      <td class="py-3 px-3 whitespace-nowrap font-extrabold text-amber-700">
        ${totalOdenen.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
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

  customersTableBody.querySelectorAll(".delete-customer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm(`"${btn.dataset.name}" isimli müşteriyi silmek istediğinize emin misiniz?`)) {
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
// 11. MÜŞTERİ / ÜRETİCİ PORTALI
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

      myCustomerLogs.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
      updateCustomerPortalStats();
      renderCustomerPortalTable();
    });
  } catch (err) {
    console.error("Müşteri verileri alınamadı:", err);
  }
}

function handleCustomerLiveCalc() {
  const amount = parseFloat(custInputAmount.value) || 0;
  const total = +(amount * publicPrice).toFixed(2);
  custLiveCalcTotal.textContent = `${total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
}

async function handleCustomerFormSubmit(e) {
  e.preventDefault();
  const dateVal = custInputDate.value;
  const amount = parseFloat(custInputAmount.value);
  const note = custInputNote.value.trim();

  if (!dateVal) {
    showToast("Lütfen teslim tarihini seçin.", "warning");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast("Lütfen teslim ettiğiniz süt miktarını girin.", "warning");
    custInputAmount.focus();
    return;
  }

  const tutar = +(amount * publicPrice).toFixed(2);

  try {
    await addDoc(collection(db, COL_CUSTOMER_LOGS), {
      tarih: dateVal,
      musteriKullaniciAdi: currentUser.kullaniciAdi,
      musteriAdSoyad: currentUser.adSoyad,
      miktar: amount,
      birimFiyat: publicPrice,
      tutar: tutar,
      not: note || "Üretici teslimatı",
      olusturulduAt: serverTimestamp()
    });

    showToast("Süt teslimatınız başarıyla işlendi!", "success");
    custMilkForm.reset();
    setDefaultDates();
    handleCustomerLiveCalc();
  } catch (err) {
    showToast("Kayıt hatası: " + err.message, "error");
  }
}

function updateCustomerPortalStats() {
  const totalMilk = myCustomerLogs.reduce((acc, l) => acc + (Number(l.miktar) || 0), 0);
  const totalMoney = myCustomerLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);

  if (custTotalMilk) custTotalMilk.textContent = totalMilk.toLocaleString("tr-TR");
  if (custTotalMoney) custTotalMoney.textContent = totalMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  if (custTotalRecordsCount) custTotalRecordsCount.textContent = `${myCustomerLogs.length} teslimat kaydı`;
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

    const price = log.birimFiyat || publicPrice;
    const tutar = log.tutar || (Number(log.miktar) * price);

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">${dateStr}</td>
      <td class="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">${Number(log.miktar).toLocaleString("tr-TR")} LT</td>
      <td class="py-3 px-3 whitespace-nowrap text-xs text-slate-500">${price.toFixed(2)} ₺ / LT</td>
      <td class="py-3 px-3 font-extrabold text-amber-700 whitespace-nowrap">${tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
      <td class="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">${escapeHtml(log.not || "-")}</td>
    `;
    custRecordsTableBody.appendChild(tr);
  });
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
    console.error("Müşteri logları dinlenemedi:", err);
  }
}

// ============================================================================
// 12. E-POSTA RAPORLAMA YÖNETİMİ (GÜNLÜK & AYLIK)
// ============================================================================
function openEmailModal() {
  if (currentUser && currentUser.email) {
    reportEmailInput.value = currentUser.email;
  }
  updateReportPreview();
  emailModal.classList.remove("hidden");
}

function closeEmailModal() {
  emailModal.classList.add("hidden");
}

function updateReportPreview() {
  const isMonthly = document.querySelector('input[name="reportFrequency"]:checked').value === "monthly";
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let filtered = [];
  if (isMonthly) {
    previewReportTitle.textContent = `Aylık Çiftlik Süt & Kazanç Raporu`;
    previewReportDate.textContent = `${now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}`;
    filtered = allRecords.filter(r => r.tarih && r.tarih.startsWith(currentMonthStr));
  } else {
    previewReportTitle.textContent = `Günlük Çiftlik Süt & Kazanç Raporu`;
    previewReportDate.textContent = `${now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}`;
    filtered = allRecords.filter(r => r.tarih === todayStr);
  }

  const totals = filtered.reduce((acc, r) => {
    acc.milk += Number(r.toplamUretim || r.toplananSut) || 0;
    acc.factoryMoney += Number(r.fabrikaGelir || (Number(r.fabrikaSut) * (r.fabrikaFiyat || factoryPrice))) || 0;
    acc.publicMoney += Number(r.halkaOdenecekPara) || 0;
    return acc;
  }, { milk: 0, factoryMoney: 0, publicMoney: 0 });

  const netProfit = +(totals.factoryMoney - totals.publicMoney).toFixed(2);

  previewTotalMilk.textContent = `${totals.milk.toLocaleString("tr-TR")} LT`;
  previewFactoryMoney.textContent = `${totals.factoryMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  previewPublicMoney.textContent = `${totals.publicMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  previewNetProfit.textContent = `${netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

  return { isMonthly, totals, netProfit, filtered };
}

function handleSendEmailReport(e) {
  e.preventDefault();
  const targetEmail = reportEmailInput.value.trim();
  if (!targetEmail) {
    showToast("Lütfen raporun gönderileceği e-posta adresini yazın.", "warning");
    return;
  }

  const { isMonthly, totals, netProfit } = updateReportPreview();
  const periodText = isMonthly ? "Aylık" : "Günlük";
  const subject = encodeURIComponent(`Çiftlik Süt ve Finans ${periodText} Raporu (${new Date().toLocaleDateString("tr-TR")})`);

  const bodyText = encodeURIComponent(
`Sayın Çiftlik Yöneticisi,

${periodText} Süt Üretim, Satış ve Alacak Raporunuz aşağıdadır:

--------------------------------------------------
📅 Dönem: ${isMonthly ? "Bu Ayın Özeti" : "Bugünün Özeti"}
🥛 Toplanan Toplam Süt: ${totals.milk.toLocaleString("tr-TR")} Litre
🏭 Fabrikaya Satış Geliri: ${totals.factoryMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
👥 Halka / Üreticilere Verilecek Para: ${totals.publicMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
💰 Net Çiftlik Kârı: ${netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
--------------------------------------------------

Bu rapor Çiftlik Süt Takip Sistemi tarafından otomatik olarak oluşturulmuştur.`
  );

  // E-posta istemcisini hazır şablon ile aç
  window.open(`mailto:${targetEmail}?subject=${subject}&body=${bodyText}`, "_blank");
  closeEmailModal();
  showToast("Rapor e-posta taslağı hazırlandı!", "success");
}

// ============================================================================
// 13. SİLME MODAL YÖNETİMİ
// ============================================================================
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
    showToast("Kayıt silinirken hata: " + err.message, "error");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Evet, Sil";
  }
}

// ============================================================================
// 14. TOAST BİLDİRİM FONKSİYONU
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
