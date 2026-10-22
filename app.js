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
const landingView = document.getElementById("landing-view");
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const customerView = document.getElementById("customer-view");
const mainHeader = document.getElementById("main-header");

// Giriş Sekmeleri & Formu
const loginTabAdmin = document.getElementById("login-tab-admin");
const loginTabCustomer = document.getElementById("login-tab-customer");
const loginForm = document.getElementById("login-form");
const loginUsernameInput = document.getElementById("login-username");
const loginPasswordInput = document.getElementById("login-password");
const loginUsernameLabel = document.getElementById("login-username-label");
const loginBtnText = document.getElementById("login-btn-text");
const loginHintBox = document.getElementById("login-hint-box");
const loginErrorAlert = document.getElementById("login-error-alert");
const loginErrorTitle = document.getElementById("login-error-title");
const loginErrorDesc = document.getElementById("login-error-desc");
const loginInfoAlert = document.getElementById("login-info-alert");
const loginInfoTitle = document.getElementById("login-info-title");
const loginInfoDesc = document.getElementById("login-info-desc");
const togglePasswordBtn = document.getElementById("toggle-password-btn");
const closeLoginModalBtn = document.getElementById("close-login-modal-btn");
const loginRememberMe = document.getElementById("login-remember-me");

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
const tabMatrixBtn = document.getElementById("tab-matrix-btn");
const tabCustomersBtn = document.getElementById("tab-customers-btn");
const adminMilkSection = document.getElementById("admin-milk-section");
const adminMatrixSection = document.getElementById("admin-matrix-section");
const adminCustomersSection = document.getElementById("admin-customers-section");
const adminCustomerCountBadge = document.getElementById("admin-customer-count-badge");
const quickChangePriceBtn = document.getElementById("quick-change-price-btn");

// Excel Çizelgesi (Aylık Matris) Elementleri
const matrixMonthSelect = document.getElementById("matrix-month-select");
const matrixYearSelect = document.getElementById("matrix-year-select");
const matrixDaysRange = document.getElementById("matrix-days-range");
const matrixRegionFilter = document.getElementById("matrix-region-filter");
const matrixUnitPriceInput = document.getElementById("matrix-unit-price-input");
const matrixTable = document.getElementById("matrix-table");
const matrixTableTitle = document.getElementById("matrix-table-title");
const matrixTableSubtitle = document.getElementById("matrix-table-subtitle");
const matrixBoxFactoryIncome = document.getElementById("matrix-box-factory-income");
const matrixBoxPublicExpense = document.getElementById("matrix-box-public-expense");
const matrixBoxNetProfit = document.getElementById("matrix-box-net-profit");
const matrixBoxTotalDeductions = document.getElementById("matrix-box-total-deductions");
const matrixExportPdfBtn = document.getElementById("matrix-export-pdf-btn");
const matrixExportExcelBtn = document.getElementById("matrix-export-excel-btn");
const matrixExportEmailBtn = document.getElementById("matrix-export-email-btn");
const matrixSeedBtn = document.getElementById("matrix-seed-btn");

// Hücre Düzenleme Modalı & Yazdırma Alanı
const matrixCellModal = document.getElementById("matrix-cell-modal");
const matrixCellForm = document.getElementById("matrix-cell-form");
const cellModalTitle = document.getElementById("cell-modal-title");
const cellModalLabel = document.getElementById("cell-modal-label");
const cellModalInput = document.getElementById("cell-modal-input");
const cellModalHint = document.getElementById("cell-modal-hint");
const closeCellModalBtn = document.getElementById("close-cell-modal-btn");
const cancelCellModalBtn = document.getElementById("cancel-cell-modal-btn");
const excelMatrixPrintArea = document.getElementById("excel-matrix-print-area");

// Admin Süt Formu (Gün / Ay / Yıl Seçicileri)
const milkForm = document.getElementById("milk-form");
const dateDay = document.getElementById("date-day");
const dateMonth = document.getElementById("date-month");
const dateYear = document.getElementById("date-year");
const totalInput = document.getElementById("input-total");
const factoryInput = document.getElementById("input-factory");
const factoryPriceInput = document.getElementById("input-factory-price");
const liveFactoryCalc = document.getElementById("live-factory-calc");
const publicPriceInput = document.getElementById("input-public-price");
const customerNameInput = document.getElementById("customer-name");
const customerDatalist = document.getElementById("customer-datalist");
const customerAmountInput = document.getElementById("customer-amount");
const customerPaidCheckbox = document.getElementById("customer-paid-checkbox");
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
const newCustRegion = document.getElementById("new-cust-region");
const newCustDeduction = document.getElementById("new-cust-deduction");
const customersTableBody = document.getElementById("customers-table-body");
const customersEmptyState = document.getElementById("customers-empty-state");

// Müşteri Portalı Elementleri (Salt Okunur Takip)
const custPortalWelcome = document.getElementById("cust-portal-welcome");
const custCurrentPriceBadge = document.getElementById("cust-current-price-badge");
const custTotalMilk = document.getElementById("cust-total-milk");
const custTotalMoney = document.getElementById("cust-total-money");
const custPaidMoney = document.getElementById("cust-paid-money");
const custPendingMoney = document.getElementById("cust-pending-money");
const custTotalRecordsCount = document.getElementById("cust-total-records-count");
const custRecordsTableBody = document.getElementById("cust-records-table-body");
const custEmptyState = document.getElementById("cust-empty-state");

// Modallar: Fiyat Modalı
const priceModal = document.getElementById("price-modal");
const priceForm = document.getElementById("price-form");
const priceFactoryInput = document.getElementById("price-factory-input");
const pricePublicInput = document.getElementById("price-public-input");
const closePriceModalBtn = document.getElementById("close-price-modal-btn");
const cancelPriceBtn = document.getElementById("cancel-price-btn");

// Modallar: Yönetici Şifre Değiştirme Modalı
const adminPasswordModal = document.getElementById("admin-password-modal");
const openAdminPasswordBtn = document.getElementById("open-admin-password-btn");
const closeAdminPasswordModalBtn = document.getElementById("close-admin-password-modal-btn");
const cancelAdminPasswordBtn = document.getElementById("cancel-admin-password-btn");
const adminPasswordForm = document.getElementById("admin-password-form");
const newAdminPasswordInput = document.getElementById("new-admin-password-input");

// Modallar: E-posta Rapor Modalı
const emailModal = document.getElementById("email-modal");
const emailReportForm = document.getElementById("email-report-form");
const reportEmailInput = document.getElementById("report-email-input");
const closeEmailModalBtn = document.getElementById("close-email-modal-btn");
const printReportBtn = document.getElementById("print-report-btn");
const copyReportTextBtn = document.getElementById("copy-report-text-btn");
const previewReportTitle = document.getElementById("preview-report-title");
const previewReportDate = document.getElementById("preview-report-date");
const previewTotalMilk = document.getElementById("preview-total-milk");
const previewFactoryMoney = document.getElementById("preview-factory-money");
const previewPublicMoney = document.getElementById("preview-public-money");
const previewPaidMoney = document.getElementById("preview-paid-money");
const previewDebtMoney = document.getElementById("preview-debt-money");
const previewNetProfit = document.getElementById("preview-net-profit");
const previewProducersList = document.getElementById("preview-producers-list");

// Modallar: Müşteri Teslimat & Ödeme Yönetimi Modalı (Admin için)
const customerPaymentModal = document.getElementById("customer-payment-modal");
const payModalCustomerName = document.getElementById("pay-modal-customer-name");
const payModalTotalMilk = document.getElementById("pay-modal-total-milk");
const payModalTotalMoney = document.getElementById("pay-modal-total-money");
const payModalPaidMoney = document.getElementById("pay-modal-paid-money");
const payModalDebtMoney = document.getElementById("pay-modal-debt-money");
const payAllRecordsBtn = document.getElementById("pay-all-records-btn");
const payModalRecordsBody = document.getElementById("pay-modal-records-body");
const closePayModalBtn = document.getElementById("close-pay-modal-btn");
const closePayModalFooterBtn = document.getElementById("close-pay-modal-footer-btn");

// Modallar: Silme Modalı
const deleteModal = document.getElementById("delete-modal");
const deleteModalText = document.getElementById("delete-modal-text");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

let activeModalCustomer = null;

// ============================================================================
// 4. BAŞLANGIÇ (INIT) & TARİH SEÇİCİLERİ (GÜN / AY / YIL)
// ============================================================================
function initApp() {
  initDateSelectors();
  setupEventListeners();
  initSettingsListener();
  initUsersListener();
  checkPersistedSession();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

function initDateSelectors() {
  // 1-31 Günler
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  // Yıllar: son 2 yıl ile gelecek 5 yıl arası
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 5; y++) {
    years.push(String(y));
  }

  function fillDaySelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    days.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = `${d}. Gün`;
      selectEl.appendChild(opt);
    });
  }

  function fillYearSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      selectEl.appendChild(opt);
    });
  }

  fillDaySelect(dateDay);
  fillYearSelect(dateYear);

  setDefaultDates();
}

function setDefaultDates() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = String(today.getFullYear());

  if (dateDay) dateDay.value = dd;
  if (dateMonth) dateMonth.value = mm;
  if (dateYear) dateYear.value = yyyy;
}

function getAdminSelectedDate() {
  if (!dateDay || !dateMonth || !dateYear) return "";
  return `${dateYear.value}-${dateMonth.value}-${dateDay.value}`;
}


// ============================================================================
// 5. ETKİNLİK DİNLEYİCİLERİ
// ============================================================================
function setupEventListeners() {
  // Giriş Sekmeleri Değişimi (Admin vs Müşteri)
  loginTabAdmin.addEventListener("click", () => switchLoginTab("admin"));
  loginTabCustomer.addEventListener("click", () => switchLoginTab("customer"));

  // Giriş Formu ve Etkileşimleri
  loginForm.addEventListener("submit", handleLogin);
  if (loginUsernameInput) loginUsernameInput.addEventListener("input", clearLoginAlerts);
  if (loginPasswordInput) loginPasswordInput.addEventListener("input", clearLoginAlerts);
  if (togglePasswordBtn) togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
  if (closeLoginModalBtn) closeLoginModalBtn.addEventListener("click", closeLoginModal);

  // Çıkış
  logoutBtn.addEventListener("click", handleLogout);

  // Admin Sekmeleri
  tabMilkBtn.addEventListener("click", () => switchAdminTab("milk"));
  if (tabMatrixBtn) tabMatrixBtn.addEventListener("click", () => switchAdminTab("matrix"));
  tabCustomersBtn.addEventListener("click", () => switchAdminTab("customers"));

  // Excel Çizelgesi (Aylık Matris) Olayları
  if (matrixMonthSelect) matrixMonthSelect.addEventListener("change", renderMatrixTable);
  if (matrixYearSelect) matrixYearSelect.addEventListener("change", renderMatrixTable);
  if (matrixDaysRange) matrixDaysRange.addEventListener("change", renderMatrixTable);
  if (matrixRegionFilter) matrixRegionFilter.addEventListener("change", renderMatrixTable);
  if (matrixUnitPriceInput) matrixUnitPriceInput.addEventListener("input", renderMatrixTable);

  if (matrixExportPdfBtn) matrixExportPdfBtn.addEventListener("click", handleMatrixExportPdf);
  if (matrixExportExcelBtn) matrixExportExcelBtn.addEventListener("click", handleMatrixExportExcel);
  if (matrixExportEmailBtn) matrixExportEmailBtn.addEventListener("click", handleMatrixExportEmail);
  if (matrixSeedBtn) matrixSeedBtn.addEventListener("click", handleMatrixSeedData);

  if (closeCellModalBtn) closeCellModalBtn.addEventListener("click", closeCellModal);
  if (cancelCellModalBtn) cancelCellModalBtn.addEventListener("click", closeCellModal);
  if (matrixCellForm) matrixCellForm.addEventListener("submit", handleSaveCellModal);

  // Fiyat Modalı
  quickChangePriceBtn.addEventListener("click", openPriceModal);
  closePriceModalBtn.addEventListener("click", closePriceModal);
  cancelPriceBtn.addEventListener("click", closePriceModal);
  priceForm.addEventListener("submit", handleSavePrices);

  // Yönetici Şifre Değiştirme Modalı
  if (openAdminPasswordBtn) openAdminPasswordBtn.addEventListener("click", openAdminPasswordModal);
  if (closeAdminPasswordModalBtn) closeAdminPasswordModalBtn.addEventListener("click", closeAdminPasswordModal);
  if (cancelAdminPasswordBtn) cancelAdminPasswordBtn.addEventListener("click", closeAdminPasswordModal);
  if (adminPasswordForm) adminPasswordForm.addEventListener("submit", handleSaveAdminPassword);

  // E-posta Rapor Modalı
  if (emailReportBtn) emailReportBtn.addEventListener("click", openEmailModal);
  if (closeEmailModalBtn) closeEmailModalBtn.addEventListener("click", closeEmailModal);
  if (emailReportForm) emailReportForm.addEventListener("submit", handleSendEmailReport);
  if (printReportBtn) printReportBtn.addEventListener("click", handleDownloadModalPdf);
  if (copyReportTextBtn) copyReportTextBtn.addEventListener("click", handleCopyReportText);

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

  // Müşteri Teslimat & Borç Ödeme Modalı (Admin)
  if (closePayModalBtn) closePayModalBtn.addEventListener("click", closeCustomerPaymentModal);
  if (closePayModalFooterBtn) closePayModalFooterBtn.addEventListener("click", closeCustomerPaymentModal);
  if (payAllRecordsBtn) payAllRecordsBtn.addEventListener("click", markAllLogsPaidForCustomer);

  // Silme Modalı
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", executeDelete);
}

// ============================================================================
// 6. GİRİŞ EKRANI SEKMELERİ & OTURUM YÖNETİMİ
// ============================================================================
function showLoginError(title, desc) {
  if (loginErrorAlert) {
    loginErrorTitle.textContent = title;
    loginErrorDesc.textContent = desc;
    loginErrorAlert.classList.remove("hidden");
    // Titreme animasyonunu yeniden tetikle
    loginErrorAlert.classList.remove("animate-shake");
    void loginErrorAlert.offsetWidth;
    loginErrorAlert.classList.add("animate-shake");
  }
  if (loginInfoAlert) loginInfoAlert.classList.add("hidden");
  showToast(`${title} ${desc}`, "error");
}

function showLoginInfo(title, desc) {
  if (loginInfoAlert) {
    loginInfoTitle.textContent = title;
    loginInfoDesc.textContent = desc;
    loginInfoAlert.classList.remove("hidden");
  }
  if (loginErrorAlert) loginErrorAlert.classList.add("hidden");
}

function clearLoginAlerts() {
  if (loginErrorAlert) loginErrorAlert.classList.add("hidden");
  if (loginInfoAlert) loginInfoAlert.classList.add("hidden");
  if (loginUsernameInput) {
    loginUsernameInput.classList.remove("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
  }
  if (loginPasswordInput) {
    loginPasswordInput.classList.remove("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
  }
}

function togglePasswordVisibility() {
  if (!loginPasswordInput) return;
  const isPass = loginPasswordInput.type === "password";
  loginPasswordInput.type = isPass ? "text" : "password";
  const eyeIcon = document.getElementById("eye-icon");
  if (eyeIcon) {
    eyeIcon.innerHTML = isPass 
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
  }
}

/**
 * Admin e-posta ve şifre ile giriş yaptığında FormSubmit üzerinden otomatik bildirim e-postası gönderir.
 * "Bu hesaba bu şifre ve mail ile giriş yaptınız"
 */
async function sendAdminLoginEmail(targetEmail, passwordVal) {
  const currentDateTime = new Date().toLocaleString("tr-TR");
  const subject = `🛡️ [Çiftlik Süt Takip] İlk Yönetici Giriş Bildirimi (${currentDateTime})`;
  
  const payload = {
    _subject: subject,
    _template: "table",
    _captcha: "false",
    "Bildirim": `Sayın Yönetici, bu hesaba (${targetEmail}) bu e-posta ve şifre ile ilk defa başarıyla giriş yapıldı.`,
    "Giriş Yapılan E-posta": targetEmail,
    "Giriş Şifresi": passwordVal,
    "İlk Giriş Zamanı": currentDateTime,
    "Sistem": "Çiftlik Süt Yönetim Portalı",
    "Sistem Adresi": window.location.href,
    "Bilgilendirme": "Bu bildirim e-postası yalnızca sisteme İLK DEFA giriş yaptığınız için iletilmiştir. Sonraki normal girişlerinizde tekrar e-posta gönderilmeyecektir."
  };

  try {
    // Kullanıcının onayladığı FormSubmit token adresi
    const primaryUrl = "https://formsubmit.co/ajax/05ba7c83d4e2d8a4494ad33fafc87d24";
    fetch(primaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Yedek olarak hedef maile doğrudan dene
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).catch(err => console.log("Mail bildirim uyarısı:", err));
    });
  } catch (e) {
    console.warn("Mail servisi notu:", e);
  }
}

function switchLoginTab(mode) {
  loginMode = mode;
  loginForm.reset();
  clearLoginAlerts();

  if (mode === "admin") {
    loginTabAdmin.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-emerald-800 shadow-xs transition flex items-center justify-center gap-1.5";
    loginTabCustomer.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5";
    loginUsernameLabel.textContent = "Yönetici E-posta Adresi";
    loginUsernameInput.type = "email";
    loginUsernameInput.placeholder = "ornek@ciftlik.com";
    loginBtnText.textContent = "Yönetici Olarak Giriş Yap";
  } else {
    loginTabCustomer.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-indigo-800 shadow-xs transition flex items-center justify-center gap-1.5";
    loginTabAdmin.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5";
    loginUsernameLabel.textContent = "Müşteri / Üretici Kullanıcı Adı veya E-posta";
    loginUsernameInput.type = "text";
    loginUsernameInput.placeholder = "Örn: ahmet veya ahmet@gmail.com";
    loginBtnText.textContent = "Müşteri / Üretici Olarak Giriş Yap";
  }

  // Kullanıcı adı ve şifre ipucu kutusu istenmediği için temizle ve gizle
  if (loginHintBox) {
    loginHintBox.innerHTML = "";
    loginHintBox.classList.add("hidden");
  }
}
window.switchLoginTab = switchLoginTab;

function openLoginModal(mode = "admin") {
  if (loginView) loginView.classList.remove("hidden");
  switchLoginTab(mode);

  // Önceki kayıtlı kullanıcı adı varsa doldur
  const savedVal = localStorage.getItem("ciftlik_saved_login_" + mode);
  if (savedVal && loginUsernameInput) {
    loginUsernameInput.value = savedVal;
  }
}
window.openLoginModal = openLoginModal;

function closeLoginModal() {
  if (loginView) loginView.classList.add("hidden");
  clearLoginAlerts();
}
window.closeLoginModal = closeLoginModal;

function showLandingView() {
  if (landingView) landingView.classList.remove("hidden");
  if (loginView) loginView.classList.add("hidden");
  if (adminView) adminView.classList.add("hidden");
  if (customerView) customerView.classList.add("hidden");
  if (mainHeader) mainHeader.classList.add("hidden");
}
window.showLandingView = showLandingView;

async function handleLogin(e) {
  e.preventDefault();
  clearLoginAlerts();

  const inputVal = loginUsernameInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value.trim();
  const rememberMe = loginRememberMe ? loginRememberMe.checked : true;

  // 1. Alan Boş Kontrolleri
  if (!inputVal && !password) {
    showLoginError("Bilgiler Eksik!", "Lütfen kullanıcı adı / e-posta ve şifrenizi giriniz.");
    loginUsernameInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
    loginPasswordInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
    loginUsernameInput.focus();
    return;
  }

  if (!inputVal) {
    showLoginError("Kullanıcı Adı / E-posta Eksik!", "Lütfen giriş yapmak için kullanıcı adı veya e-posta adresinizi giriniz.");
    loginUsernameInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
    loginUsernameInput.focus();
    return;
  }

  if (!password) {
    showLoginError("Şifre Eksik!", "Lütfen şifrenizi giriniz.");
    loginPasswordInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
    loginPasswordInput.focus();
    return;
  }

  // 2. Admin Girişi (E-posta ve Şifre Kontrolü)
  if (loginMode === "admin") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inputVal)) {
      showLoginError(
        "Geçersiz E-posta Formatı!", 
        "Yönetici girişi için lütfen geçerli bir e-posta formatı giriniz (Örn: admin@ciftlik.com)."
      );
      loginUsernameInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
      loginUsernameInput.focus();
      return;
    }

    // Yönetici Şifre Kontrolü (Her yönetici e-postası kendi belirlediği şifreyi kullanabilir)
    const emailKey = inputVal.toLowerCase().trim();
    const savedEmailPwd = localStorage.getItem("ciftlik_admin_pwd_" + emailKey);
    const globalAdminPwd = localStorage.getItem("ciftlik_admin_password");

    // Eğer bu yönetici e-postası ilk defa giriliyorsa:
    // Girdiği şifreyi bu e-postanın yeni yönetici şifresi olarak doğrudan kabul et ve kaydet!
    if (!savedEmailPwd) {
      localStorage.setItem("ciftlik_admin_pwd_" + emailKey, password);
      localStorage.setItem("ciftlik_admin_password", password);
    } else {
      // Daha önce bu e-posta için şifre belirlenmişse kontrol et (veya acil durum '123')
      const validPasswords = [
        savedEmailPwd,
        globalAdminPwd,
        "123"
      ].filter(Boolean);

      if (!validPasswords.includes(password)) {
        showLoginError(
          "Hatalı Yönetici Şifresi!", 
          `"${inputVal}" e-postası için belirlediğiniz şifre uyuşmuyor. Lütfen doğru şifrenizi giriniz veya "123" ile giriş yapıp üst menüden şifrenizi yenileyiniz.`
        );
        loginPasswordInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
        loginPasswordInput.focus();
        return;
      }

      // Doğru giriş yapıldığında şifreyi sabitle
      localStorage.setItem("ciftlik_admin_pwd_" + emailKey, password);
      localStorage.setItem("ciftlik_admin_password", password);
    }

    // Başarılı Yönetici Girişi
    const prefix = inputVal.split("@")[0];
    const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);

    const adminUser = {
      id: "admin_" + inputVal.replace(/[^a-zA-Z0-9]/g, "_"),
      kullaniciAdi: inputVal,
      email: inputVal,
      adSoyad: `${capitalized} (Yönetici)`,
      rol: "admin"
    };

    // Girişte bildirim gönderimi kapalı: Sessizce ve doğrudan oturum açılır
    setSession(adminUser, rememberMe);
    return;
  }

  // 3. Müşteri / Üretici Girişi (Koleksiyondan eşleştir)
  const usernameMatch = allCustomers.find(c => 
    c.kullaniciAdi.toLowerCase() === inputVal || (c.email && c.email.toLowerCase() === inputVal)
  );

  if (!usernameMatch) {
    showLoginError(
      "Müşteri Bulunamadı!", 
      `"${inputVal}" kullanıcı adına sahip müşteri sistemde kayıtlı değil. Lütfen kullanıcı adınızı kontrol ediniz veya yöneticinizden kayıt talep ediniz.`
    );
    loginUsernameInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
    loginUsernameInput.focus();
    return;
  }

  if (usernameMatch.sifre !== password) {
    showLoginError(
      "Hatalı Müşteri Şifresi!", 
      `Sayın ${usernameMatch.adSoyad}, girdiğiniz şifre yanlış! Lütfen şifrenizi kontrol edip tekrar deneyiniz.`
    );
    loginPasswordInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
    loginPasswordInput.focus();
    return;
  }

  // Başarılı Müşteri Girişi
  const customerUser = {
    id: usernameMatch.id,
    kullaniciAdi: usernameMatch.kullaniciAdi,
    adSoyad: usernameMatch.adSoyad,
    rol: "musteri",
    email: usernameMatch.email || "",
    telefon: usernameMatch.telefon || ""
  };
  setSession(customerUser, rememberMe);
  showToast(`Hoş geldiniz, ${customerUser.adSoyad}!`, "success");
}


function setSession(user, rememberMe = true) {
  currentUser = user;
  if (rememberMe) {
    localStorage.setItem("ciftlik_aktif_kullanici", JSON.stringify(user));
    localStorage.setItem("ciftlik_remember_me", "true");
    localStorage.setItem("ciftlik_saved_login_" + user.rol, user.kullaniciAdi || user.email);
  } else {
    sessionStorage.setItem("ciftlik_aktif_kullanici", JSON.stringify(user));
    localStorage.removeItem("ciftlik_aktif_kullanici");
    localStorage.removeItem("ciftlik_remember_me");
  }
  applyUserView();
}

function checkPersistedSession() {
  try {
    const rawLocal = localStorage.getItem("ciftlik_aktif_kullanici");
    const isRemembered = localStorage.getItem("ciftlik_remember_me") === "true";
    const rawSession = sessionStorage.getItem("ciftlik_aktif_kullanici");

    const raw = rawSession || (isRemembered ? rawLocal : null);
    if (raw) {
      currentUser = JSON.parse(raw);
      applyUserView();
    } else {
      showLandingView();
    }
  } catch (e) {
    showLandingView();
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem("ciftlik_aktif_kullanici");
  sessionStorage.removeItem("ciftlik_aktif_kullanici");
  showLandingView();
  showToast("Başarıyla çıkış yapıldı.", "info");
}

function applyUserView() {
  if (!currentUser) {
    showLandingView();
    return;
  }

  if (landingView) landingView.classList.add("hidden");
  if (loginView) loginView.classList.add("hidden");
  if (mainHeader) mainHeader.classList.remove("hidden");

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

function openAdminPasswordModal() {
  if (newAdminPasswordInput) {
    newAdminPasswordInput.value = "";
    setTimeout(() => newAdminPasswordInput.focus(), 100);
  }
  if (adminPasswordModal) adminPasswordModal.classList.remove("hidden");
}

function closeAdminPasswordModal() {
  if (adminPasswordModal) adminPasswordModal.classList.add("hidden");
}

function handleSaveAdminPassword(e) {
  e.preventDefault();
  const newPwd = newAdminPasswordInput ? newAdminPasswordInput.value.trim() : "";
  if (!newPwd) {
    showToast("Lütfen yeni bir şifre giriniz.", "warning");
    return;
  }

  const emailKey = (currentUser && currentUser.email) ? currentUser.email.toLowerCase().trim() : "admin";
  localStorage.setItem("ciftlik_admin_pwd_" + emailKey, newPwd);
  localStorage.setItem("ciftlik_admin_password", newPwd);

  closeAdminPasswordModal();
  showToast("Yönetici şifreniz başarıyla güncellendi! Sonraki girişlerinizde bu şifreyi kullanabilirsiniz.", "success", 5000);
}

// ============================================================================
// 8. ADMİN SÜT & FABRİKA FORMU HESAPLAMALARI
// ============================================================================
function handleAddFormProducer() {
  const name = customerNameInput.value.trim();
  const amount = parseFloat(customerAmountInput.value);
  const pPrice = parseFloat(publicPriceInput.value) || publicPrice;
  const isPaid = customerPaidCheckbox ? customerPaidCheckbox.checked : false;

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
    odendi: isPaid,
    musteriKullaniciAdi: username
  });

  customerNameInput.value = "";
  customerAmountInput.value = "";
  if (customerPaidCheckbox) customerPaidCheckbox.checked = false;
  customerNameInput.focus();

  renderFormProducerList();
  handleLiveCalculation();
}

function handleRemoveFormProducer(id) {
  formProducers = formProducers.filter(p => p.id !== id);
  renderFormProducerList();
  handleLiveCalculation();
}

function toggleFormProducerPaid(id) {
  const prod = formProducers.find(p => p.id === id);
  if (prod) {
    prod.odendi = !prod.odendi;
    renderFormProducerList();
  }
}

function renderFormProducerList() {
  if (!customerListBox) return;
  const totalHalkSut = formProducers.reduce((acc, p) => acc + (Number(p.miktar) || 0), 0);
  const totalHalkBorc = formProducers.reduce((acc, p) => acc + (Number(p.tutar) || 0), 0);
  const totalPaid = formProducers.filter(p => p.odendi).reduce((acc, p) => acc + (Number(p.tutar) || 0), 0);
  const remainingDebt = +(totalHalkBorc - totalPaid).toFixed(2);

  if (formProducers.length === 0) {
    customerListBox.innerHTML = `
      <div id="customer-empty-text" class="text-center py-2 text-xs text-amber-500 italic bg-white/50 rounded-xl border border-dashed border-amber-200">
        Henüz üretici eklenmedi
      </div>
    `;
    badgeHalkBorc.textContent = "Halka: 0.00 ₺";
    return;
  }

  badgeHalkBorc.textContent = `Toplam: ${totalHalkBorc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ (Ödenen: ${totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ | Kalan: ${remainingDebt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺)`;

  customerListBox.innerHTML = "";
  formProducers.forEach(prod => {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-amber-100 shadow-xs text-xs";
    item.innerHTML = `
      <div class="flex items-center gap-2 overflow-hidden">
        <div class="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
          ${prod.adSoyad.charAt(0).toUpperCase()}
        </div>
        <div class="truncate">
          <span class="font-semibold text-slate-800">${escapeHtml(prod.adSoyad)}</span>
          <span class="text-[10px] text-slate-400 block">${Number(prod.miktar).toLocaleString("tr-TR")} LT &bull; ${prod.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button 
          type="button" 
          data-id="${prod.id}"
          class="toggle-form-paid-btn px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition ${prod.odendi ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}"
          title="Ödeme durumunu değiştirmek için tıklayın"
        >
          ${prod.odendi ? '✓ Ödendi' : '⏳ Ödenmedi'}
        </button>
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

  customerListBox.querySelectorAll(".toggle-form-paid-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleFormProducerPaid(btn.dataset.id));
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

  const selectedDate = getAdminSelectedDate();
  if (!selectedDate) {
    showToast("Lütfen geçerli bir kayıt tarihi seçin.", "warning");
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
      tarih: selectedDate,
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

    // 2. Müşteri loglarını Firestore'a işle (Ödendi/Ödenmedi durumuyla beraber)
    for (const prod of formProducers) {
      if (prod.musteriKullaniciAdi) {
        await addDoc(collection(db, COL_CUSTOMER_LOGS), {
          tarih: selectedDate,
          musteriKullaniciAdi: prod.musteriKullaniciAdi,
          musteriAdSoyad: prod.adSoyad,
          miktar: Number(prod.miktar),
          birimFiyat: Number(prod.birimFiyat || pPrice),
          tutar: Number(prod.tutar),
          odendi: !!prod.odendi, // <--- Ödeme Durumu
          not: prod.odendi ? "Admin tarafından eklendi (Ödendi)" : "Admin tarafından eklendi (Ödenmedi - Bekliyor)",
          olusturulduAt: serverTimestamp()
        });
      }
    }

    showToast("Günlük kayıt ve hesaplamalar başarıyla kaydedildi!", "success");

    milkForm.reset();
    formProducers = [];
    renderFormProducerList();
    setDefaultDates();
    if (customerPaidCheckbox) customerPaidCheckbox.checked = false;
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

    let dateStr = formatDisplayDate(record.tarih);

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
      if (adminMatrixSection && !adminMatrixSection.classList.contains("hidden")) {
        renderMatrixTable();
      }
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
  const bolge = (newCustRegion && newCustRegion.value.trim().toUpperCase()) || "VELİMEŞE";
  const kesilecekPara = parseFloat(newCustDeduction && newCustDeduction.value) || 0;

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
      bolge,
      kesilecekPara,
      rol: "musteri",
      olusturulduAt: serverTimestamp()
    });

    showToast(`"${adSoyad}" başarıyla müşteri/üretici olarak eklendi!`, "success");
    newCustomerForm.reset();
    renderMatrixTable();
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
    const totalHakedis = custLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);
    const totalPaid = custLogs.filter(l => l.odendi).reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);
    const remainingDebt = +(totalHakedis - totalPaid).toFixed(2);
    const kesilecek = Number(cust.kesilecekPara) || 0;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-4 whitespace-nowrap">
        <div class="font-bold text-slate-900 flex items-center gap-1.5">
          <span>${escapeHtml(cust.adSoyad)}</span>
          <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            ${escapeHtml(cust.bolge || "VELİMEŞE")}
          </span>
        </div>
        ${cust.telefon ? `<div class="text-[11px] text-slate-400">${escapeHtml(cust.telefon)}</div>` : ""}
        ${kesilecek > 0 ? `<div class="text-[10px] text-amber-700 font-bold">Avans/Kesinti: ${kesilecek.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>` : ""}
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <div class="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg inline-block">
          Giriş: <strong>${escapeHtml(cust.kullaniciAdi)}</strong> &bull; Şifre: <strong>${escapeHtml(cust.sifre)}</strong>
        </div>
      </td>
      <td class="py-3 px-3 whitespace-nowrap font-bold text-slate-800">
        ${totalMilk.toLocaleString("tr-TR")} LT
      </td>
      <td class="py-3 px-3 whitespace-nowrap font-extrabold text-slate-800">
        ${totalHakedis.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
          ${totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
        </span>
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold ${remainingDebt > 0 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'}">
          ${remainingDebt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
        </span>
      </td>
      <td class="py-3 px-3 whitespace-nowrap text-right flex items-center justify-end gap-1.5">
        <button 
          data-username="${cust.kullaniciAdi}" 
          class="open-payment-btn px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition flex items-center gap-1 shadow-2xs"
          title="Teslimatları & Ödeme Durumlarını Yönet"
        >
          <span>💳 Ödeme & Detay</span>
        </button>
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

  // Ödeme & Detay Butonları
  customersTableBody.querySelectorAll(".open-payment-btn").forEach(btn => {
    btn.addEventListener("click", () => openCustomerPaymentModal(btn.dataset.username));
  });

  // Sil Butonları
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

// ============================================================================
// 10.1. MÜŞTERİ ÖDEME & TESLİMAT MODALI (ADMIN İÇİN BORÇ/ÖDENDİ YÖNETİMİ)
// ============================================================================
function openCustomerPaymentModal(username) {
  const cust = allCustomers.find(c => c.kullaniciAdi === username);
  if (!cust) return;
  activeModalCustomer = cust;

  payModalCustomerName.textContent = `${cust.adSoyad} - Teslimat & Borç / Ödeme Takibi`;
  renderCustomerPaymentModalRecords();
  customerPaymentModal.classList.remove("hidden");
}

function closeCustomerPaymentModal() {
  activeModalCustomer = null;
  customerPaymentModal.classList.add("hidden");
}

function renderCustomerPaymentModalRecords() {
  if (!activeModalCustomer || !payModalRecordsBody) return;
  const custLogs = allCustomerLogs.filter(l => l.musteriKullaniciAdi === activeModalCustomer.kullaniciAdi);

  const totalMilk = custLogs.reduce((acc, l) => acc + (Number(l.miktar) || 0), 0);
  const totalMoney = custLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);
  const totalPaid = custLogs.filter(l => l.odendi).reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);
  const totalDebt = +(totalMoney - totalPaid).toFixed(2);

  payModalTotalMilk.textContent = `${totalMilk.toLocaleString("tr-TR")} LT`;
  payModalTotalMoney.textContent = `${totalMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  payModalPaidMoney.textContent = `${totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  payModalDebtMoney.textContent = `${totalDebt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

  payModalRecordsBody.innerHTML = "";

  if (custLogs.length === 0) {
    payModalRecordsBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-xs text-slate-400 italic">
          Bu müşteri adına henüz süt teslimat kaydı bulunmuyor.
        </td>
      </tr>
    `;
    return;
  }

  custLogs.forEach(log => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-colors";
    const dateStr = formatDisplayDate(log.tarih);
    const tutar = Number(log.tutar) || (Number(log.miktar) * (log.birimFiyat || publicPrice));
    const isPaid = !!log.odendi;

    tr.innerHTML = `
      <td class="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">${dateStr}</td>
      <td class="py-2.5 px-2 font-bold text-slate-900 whitespace-nowrap">${Number(log.miktar).toLocaleString("tr-TR")} LT</td>
      <td class="py-2.5 px-2 font-bold text-indigo-700 whitespace-nowrap">${tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
      <td class="py-2.5 px-2 whitespace-nowrap">
        ${isPaid 
          ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Ödendi</span>` 
          : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">⏳ Ödenmedi</span>`}
      </td>
      <td class="py-2.5 px-3 text-right whitespace-nowrap">
        <button 
          type="button" 
          data-id="${log.id}" 
          data-paid="${isPaid}"
          class="toggle-log-paid-btn px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-2xs ${isPaid ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}"
        >
          ${isPaid ? 'Ödenmedi Yap' : '✓ Ödendi Olarak İşaretle'}
        </button>
      </td>
    `;
    payModalRecordsBody.appendChild(tr);
  });

  payModalRecordsBody.querySelectorAll(".toggle-log-paid-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const logId = btn.dataset.id;
      const currentPaid = btn.dataset.paid === "true";
      toggleCustomerLogPaid(logId, !currentPaid);
    });
  });
}

async function toggleCustomerLogPaid(logId, newStatus) {
  try {
    await setDoc(doc(db, COL_CUSTOMER_LOGS, logId), {
      odendi: newStatus,
      odendiGuncellendiAt: serverTimestamp()
    }, { merge: true });

    showToast(newStatus ? "Ödeme 'Ödendi' olarak işaretlendi!" : "Kayıt 'Ödenmedi' olarak güncellendi.", "success");
  } catch (err) {
    showToast("Ödeme durumu güncellenirken hata: " + err.message, "error");
  }
}

async function markAllLogsPaidForCustomer() {
  if (!activeModalCustomer) return;
  const unpaidLogs = allCustomerLogs.filter(l => l.musteriKullaniciAdi === activeModalCustomer.kullaniciAdi && !l.odendi);

  if (unpaidLogs.length === 0) {
    showToast("Bu müşterinin zaten tüm teslimatları ödenmiş durumda.", "info");
    return;
  }

  try {
    for (const log of unpaidLogs) {
      await setDoc(doc(db, COL_CUSTOMER_LOGS, log.id), {
        odendi: true,
        odendiGuncellendiAt: serverTimestamp()
      }, { merge: true });
    }
    showToast(`${activeModalCustomer.adSoyad} için tüm borçlar 'Ödendi' olarak kapatıldı!`, "success");
  } catch (err) {
    showToast("Toplu ödeme hatası: " + err.message, "error");
  }
}

function switchAdminTab(tab) {
  if (tab === "milk") {
    tabMilkBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 text-white shadow-sm transition flex items-center gap-2";
    if (tabMatrixBtn) tabMatrixBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2 shadow-2xs";
    tabCustomersBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2";
    adminMilkSection.classList.remove("hidden");
    if (adminMatrixSection) adminMatrixSection.classList.add("hidden");
    adminCustomersSection.classList.add("hidden");
  } else if (tab === "matrix") {
    if (tabMatrixBtn) tabMatrixBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 text-white shadow-sm transition flex items-center gap-2 shadow-2xs";
    tabMilkBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2";
    tabCustomersBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2";
    adminMilkSection.classList.add("hidden");
    if (adminMatrixSection) adminMatrixSection.classList.remove("hidden");
    adminCustomersSection.classList.add("hidden");
    renderMatrixTable();
  } else {
    tabCustomersBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 text-white shadow-sm transition flex items-center gap-2";
    tabMilkBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2";
    if (tabMatrixBtn) tabMatrixBtn.className = "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-2 shadow-2xs";
    adminMilkSection.classList.add("hidden");
    if (adminMatrixSection) adminMatrixSection.classList.add("hidden");
    adminCustomersSection.classList.remove("hidden");
  }
}

// ============================================================================
// 10.2. EXCEL ÇİZELGESİ & BÖLGE MATRİS YÖNETİMİ (PDF / EXCEL / E-POSTA ÇIKTILI)
// ============================================================================
const EXCEL_SEED_DATA = [
  // VELİMEŞE
  { bolge: "VELİMEŞE", adSoyad: "SİNAN SEZEN", kesilecekPara: 0, days: { "16": 19, "17": 34, "18": 27, "19": 27, "20": 27, "21": 21, "22": 28 } },
  { bolge: "VELİMEŞE", adSoyad: "AHMET GÜNAY", kesilecekPara: 0, days: { "16": 57, "17": 44, "18": 55, "19": 35, "20": 52, "21": 32, "22": 57 } },
  { bolge: "VELİMEŞE", adSoyad: "HÜSEYİN EREN", kesilecekPara: 0, days: { "19": 30, "22": 40 } },
  { bolge: "VELİMEŞE", adSoyad: "FUAT VARLI", kesilecekPara: 0, days: {} },
  { bolge: "VELİMEŞE", adSoyad: "MELİHA Y KUL", kesilecekPara: 0, days: { "16": 50, "17": 46, "18": 55, "19": 55, "20": 48, "21": 38, "22": 40 } },
  { bolge: "VELİMEŞE", adSoyad: "SELO DARGIN", kesilecekPara: 0, days: { "16": 37, "17": 36, "18": 36, "19": 40, "20": 40, "21": 38, "22": 37 } },
  { bolge: "VELİMEŞE", adSoyad: "AHMET DARGIN", kesilecekPara: 0, days: { "16": 14, "17": 19, "18": 15, "19": 14, "20": 19, "21": 10, "22": 19 } },
  { bolge: "VELİMEŞE", adSoyad: "HAKAN TÜRKEL", kesilecekPara: 0, days: { "17": 235, "19": 130, "20": 102, "21": 172 } },
  { bolge: "VELİMEŞE", adSoyad: "ZEKİ TAŞ", kesilecekPara: 0, days: {} },
  { bolge: "VELİMEŞE", adSoyad: "HÜSEYİN KARA", kesilecekPara: 0, days: { "16": 8, "17": 15, "18": 15, "19": 16, "20": 15, "21": 20, "22": 12 } },
  { bolge: "VELİMEŞE", adSoyad: "ÖZKAN GÖKÇE", kesilecekPara: 100000.0, days: { "16": 287, "17": 287, "18": 292, "19": 276, "20": 287, "21": 296, "22": 303 } },
  { bolge: "VELİMEŞE", adSoyad: "ÖZCAN ŞEN", kesilecekPara: 0, days: { "17": 6, "18": 18, "19": 7, "20": 22, "21": 15, "22": 14 } },
  { bolge: "VELİMEŞE", adSoyad: "FAHRİ KILIÇ", kesilecekPara: 0, days: { "16": 126, "17": 105, "18": 96, "19": 111, "20": 140, "21": 130, "22": 140 } },
  { bolge: "VELİMEŞE", adSoyad: "NECDET AYAN", kesilecekPara: 0, days: { "16": 27, "17": 28, "18": 22, "19": 18, "20": 23, "21": 26, "22": 26 } },
  { bolge: "VELİMEŞE", adSoyad: "ERHAN ŞAHİN", kesilecekPara: 0, days: { "16": 40, "17": 45, "18": 56, "19": 55, "20": 50, "21": 51, "22": 60 } },
  { bolge: "VELİMEŞE", adSoyad: "YUSUF ORAL", kesilecekPara: 0, days: { "16": 51, "17": 70, "19": 44, "20": 70, "21": 31, "22": 68 } },
  { bolge: "VELİMEŞE", adSoyad: "FERHAT ÇETİN", kesilecekPara: 0, days: { "16": 22, "17": 21, "18": 20, "19": 22, "20": 21, "21": 21, "22": 10 } },
  { bolge: "VELİMEŞE", adSoyad: "NEBİ CAN ASUR", kesilecekPara: 0, days: { "17": 23, "18": 26, "19": 25, "20": 22, "21": 22, "22": 27 } },
  { bolge: "VELİMEŞE", adSoyad: "İKRAM 23", kesilecekPara: 0, days: { "16": 36, "17": 37, "18": 36, "19": 35, "20": 36, "21": 31, "22": 33 } },
  { bolge: "VELİMEŞE", adSoyad: "HÜSNÜ BOZKUŞ", kesilecekPara: 0, days: { "16": 130, "17": 134, "18": 131, "19": 130, "20": 124, "21": 130, "22": 134 } },
  { bolge: "VELİMEŞE", adSoyad: "RECAİ AYDIN", kesilecekPara: 1300.0, days: { "16": 36, "17": 27, "18": 33, "19": 34, "20": 31, "21": 31, "22": 30 } },
  { bolge: "VELİMEŞE", adSoyad: "GÖRKEM AYDIN", kesilecekPara: 0, days: { "16": 118, "17": 150, "18": 101, "19": 102, "20": 102, "21": 130, "22": 100 } },
  { bolge: "VELİMEŞE", adSoyad: "TAYFUN", kesilecekPara: 0, days: { "16": 33, "17": 54, "18": 53, "19": 61, "20": 56, "21": 61, "22": 59 } },
  { bolge: "VELİMEŞE", adSoyad: "CAVİT DAĞ", kesilecekPara: 0, days: {} },

  // EFLAİM
  { bolge: "EFLAİM", adSoyad: "YUNUS ÖZTÜRK", kesilecekPara: 0, days: { "16": 9, "18": 16, "19": 20, "20": 15, "21": 15, "22": 17 } },
  { bolge: "EFLAİM", adSoyad: "MEHMET CEYLAN", kesilecekPara: 0, days: { "16": 7, "17": 13, "18": 15, "19": 9, "20": 21, "21": 17, "22": 17 } },
  { bolge: "EFLAİM", adSoyad: "YALÇIN AYDIN", kesilecekPara: 0, days: { "16": 18, "17": 20, "18": 10, "19": 19, "20": 19, "21": 19, "22": 20 } },

  // KAPAKLI
  { bolge: "KAPAKLI", adSoyad: "SERDAR ÇIRA", kesilecekPara: 0, days: { "16": 122, "17": 125, "18": 116, "19": 112, "20": 120, "21": 125, "22": 113 } },
  { bolge: "KAPAKLI", adSoyad: "KARADENİZ ÇİFTLİĞİ", kesilecekPara: 0, days: { "16": 146, "17": 133, "18": 133, "19": 126, "20": 142, "21": 130, "22": 134 } },
  { bolge: "KAPAKLI", adSoyad: "SERHAN KAYA", kesilecekPara: 0, days: { "16": 24, "17": 38, "18": 30, "19": 30, "20": 64, "21": 57 } },

  // SÜTÇÜLER
  { bolge: "SÜTÇÜLER", adSoyad: "GÜNEŞ", kesilecekPara: 0, days: { "16": 1543, "17": 1518, "18": 1510, "19": 1426, "20": 1519, "21": 1525, "22": 1396 } },
  { bolge: "SÜTÇÜLER", adSoyad: "TUTKU ÜNAL", kesilecekPara: 0, days: {} },
  { bolge: "SÜTÇÜLER", adSoyad: "AYHAN K KISA", kesilecekPara: 0, days: { "16": 290 } },
  { bolge: "SÜTÇÜLER", adSoyad: "YASİN YAKUT", kesilecekPara: 0, days: {} },
  { bolge: "SÜTÇÜLER", adSoyad: "GÖKSEL BOZDAĞ", kesilecekPara: 0, days: {} },
  { bolge: "SÜTÇÜLER", adSoyad: "SUAT", kesilecekPara: 0, days: {} },

  // DİĞER
  { bolge: "DİĞER", adSoyad: "YAŞAR CESUR", kesilecekPara: 0, days: { "16": 290 } },
  { bolge: "DİĞER", adSoyad: "METİN", kesilecekPara: 0, days: {} },
  { bolge: "DİĞER", adSoyad: "VAHİT K. KISA", kesilecekPara: 1300.0, days: { "16": 104 } },
  { bolge: "DİĞER", adSoyad: "ZÜBEYDE KARTAL", kesilecekPara: 0, days: { "16": 166 } },
  { bolge: "DİĞER", adSoyad: "HÜSEYİN BAKIN", kesilecekPara: 0, days: { "16": 347 } },
  { bolge: "DİĞER", adSoyad: "ONUR KARAKUŞ", kesilecekPara: 0, days: {} }
];

const EXCEL_SEED_KANTAR = {
  "16": 2651,
  "17": 2385,
  "18": 2354,
  "19": 2768,
  "20": 2598,
  "21": 2533
};

let activeCellEdit = null; // { type: 'milk' | 'deduction' | 'kantar', cust, dateStr, currentVal }

function getMatrixData() {
  const yyyy = matrixYearSelect ? matrixYearSelect.value : "2026";
  const mm = matrixMonthSelect ? matrixMonthSelect.value : "10";
  const rangeType = matrixDaysRange ? matrixDaysRange.value : "16-31";
  const regionFilter = matrixRegionFilter ? matrixRegionFilter.value : "all";
  const unitPrice = parseFloat(matrixUnitPriceInput ? matrixUnitPriceInput.value : 24.30) || 24.30;

  // Gün listesini oluştur
  let startDay = 16;
  let endDay = 31;
  if (rangeType === "01-15") {
    startDay = 1;
    endDay = 15;
  } else if (rangeType === "01-31") {
    startDay = 1;
    endDay = 31;
  }

  const columns = [];
  for (let d = startDay; d <= endDay; d++) {
    const dayStr = String(d).padStart(2, "0");
    const fullDate = `${yyyy}-${mm}-${dayStr}`;
    columns.push({
      dayStr,
      fullDate,
      displayDate: `${dayStr}.${mm}.${yyyy}`
    });
  }

  // Üreticileri belirle (allCustomers varsa kullan, yoksa SEED listesini temel al)
  let baseCustomers = [];
  if (allCustomers && allCustomers.length > 0) {
    baseCustomers = allCustomers.map(c => ({
      id: c.id,
      adSoyad: c.adSoyad,
      kullaniciAdi: c.kullaniciAdi,
      bolge: (c.bolge || "VELİMEŞE").toUpperCase(),
      kesilecekPara: Number(c.kesilecekPara) || 0
    }));
  } else {
    baseCustomers = EXCEL_SEED_DATA.map((s, idx) => ({
      id: "seed_" + idx,
      adSoyad: s.adSoyad,
      kullaniciAdi: s.adSoyad.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      bolge: s.bolge.toUpperCase(),
      kesilecekPara: s.kesilecekPara || 0,
      seedDays: s.days
    }));
  }

  // Bölge filtresi uygula
  if (regionFilter !== "all") {
    baseCustomers = baseCustomers.filter(c => c.bolge === regionFilter.toUpperCase());
  }

  // Bölgelere göre grupla
  const REGION_ORDER = ["VELİMEŞE", "EFLAİM", "KAPAKLI", "SÜTÇÜLER", "DİĞER"];
  const grouped = {};
  REGION_ORDER.forEach(r => { grouped[r] = []; });

  baseCustomers.forEach(cust => {
    const b = cust.bolge || "DİĞER";
    if (!grouped[b]) grouped[b] = [];
    grouped[b].push(cust);
  });

  // Her üretici ve gün için değerleri topla
  const rows = [];
  const dayColumnTotals = {};
  columns.forEach(col => { dayColumnTotals[col.fullDate] = 0; });

  let grandTotalMilk = 0;
  let grandTotalCarpim = 0;
  let grandTotalDeductions = 0;
  let grandTotalPayable = 0;

  REGION_ORDER.forEach(regName => {
    const custs = grouped[regName];
    if (!custs || custs.length === 0) return;

    custs.forEach(cust => {
      const dayValues = {};
      let rowTotalMilk = 0;

      columns.forEach(col => {
        // 1. allCustomerLogs kontrol et
        const log = allCustomerLogs.find(l => 
          l.tarih === col.fullDate && 
          ((l.musteriKullaniciAdi && l.musteriKullaniciAdi === cust.kullaniciAdi) ||
           (l.adSoyad && l.adSoyad.toLowerCase() === cust.adSoyad.toLowerCase()))
        );

        let val = 0;
        if (log && log.miktar !== undefined) {
          val = Number(log.miktar) || 0;
        } else {
          // 2. localStorage kontrol et
          const localKey = `matrix_milk_${cust.kullaniciAdi}_${col.fullDate}`;
          const localSaved = localStorage.getItem(localKey);
          if (localSaved !== null) {
            val = Number(localSaved) || 0;
          } else if (cust.seedDays && cust.seedDays[col.dayStr] !== undefined) {
            val = Number(cust.seedDays[col.dayStr]) || 0;
          } else {
            // Seed datadan isim eşleştir
            const seedMatch = EXCEL_SEED_DATA.find(s => s.adSoyad.toLowerCase() === cust.adSoyad.toLowerCase());
            if (seedMatch && seedMatch.days && seedMatch.days[col.dayStr] !== undefined) {
              val = Number(seedMatch.days[col.dayStr]) || 0;
            }
          }
        }

        dayValues[col.fullDate] = val;
        rowTotalMilk += val;
        dayColumnTotals[col.fullDate] += val;
      });

      // Kesilecek para
      let deduction = Number(cust.kesilecekPara) || 0;
      const localDeduct = localStorage.getItem(`matrix_deduct_${cust.kullaniciAdi}`);
      if (localDeduct !== null) deduction = Number(localDeduct) || 0;

      const carpim = +(rowTotalMilk * unitPrice).toFixed(2);
      const payable = +(carpim - deduction).toFixed(2);

      grandTotalMilk += rowTotalMilk;
      grandTotalCarpim += carpim;
      grandTotalDeductions += deduction;
      grandTotalPayable += payable;

      rows.push({
        cust,
        bolge: regName,
        dayValues,
        rowTotalMilk,
        deduction,
        carpim,
        payable
      });
    });
  });

  // Kantar Değerleri
  const dayKantarTotals = {};
  let grandTotalKantar = 0;

  columns.forEach(col => {
    let kantarVal = 0;
    const rec = allRecords.find(r => r.tarih === col.fullDate);
    if (rec && rec.fabrikaSut !== undefined) {
      kantarVal = Number(rec.fabrikaSut) || 0;
    } else {
      const localKantar = localStorage.getItem(`matrix_kantar_${col.fullDate}`);
      if (localKantar !== null) {
        kantarVal = Number(localKantar) || 0;
      } else if (EXCEL_SEED_KANTAR[col.dayStr] !== undefined) {
        kantarVal = Number(EXCEL_SEED_KANTAR[col.dayStr]) || 0;
      }
    }
    dayKantarTotals[col.fullDate] = kantarVal;
    grandTotalKantar += kantarVal;
  });

  const factoryIncome = +(grandTotalKantar * (factoryPrice || 28.0)).toFixed(2);
  const netProfit = +(factoryIncome - grandTotalPayable).toFixed(2);

  return {
    columns,
    rows,
    grouped,
    regionOrder: REGION_ORDER,
    dayColumnTotals,
    dayKantarTotals,
    unitPrice,
    grandTotalMilk,
    grandTotalKantar,
    factoryIncome,
    grandTotalCarpim,
    grandTotalDeductions,
    grandTotalPayable,
    netProfit
  };
}

function renderMatrixTable() {
  if (!matrixTable) return;
  const data = getMatrixData();

  if (matrixTableTitle) {
    const monthName = matrixMonthSelect ? matrixMonthSelect.options[matrixMonthSelect.selectedIndex].text : "Ekim";
    const yyyy = matrixYearSelect ? matrixYearSelect.value : "2026";
    matrixTableTitle.innerHTML = `<span>📋 Çiftlik Süt Toplama ve Üretici Hakediş Çizelgesi</span> <span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold ml-2">${monthName} ${yyyy}</span>`;
  }

  if (matrixTableSubtitle) {
    const startD = data.columns[0]?.dayStr || "16";
    const endD = data.columns[data.columns.length - 1]?.dayStr || "31";
    matrixTableSubtitle.textContent = `Dönem: ${startD}.${matrixMonthSelect?.value || '10'}.${matrixYearSelect?.value || '2026'} - ${endD}.${matrixMonthSelect?.value || '10'}.${matrixYearSelect?.value || '2026'} • Alış Birim Fiyatı: ${data.unitPrice.toFixed(2)} ₺/LT`;
  }

  // Kartları güncelle
  if (matrixBoxFactoryIncome) matrixBoxFactoryIncome.textContent = `${data.factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  if (matrixBoxPublicExpense) matrixBoxPublicExpense.textContent = `${data.grandTotalPayable.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  if (matrixBoxNetProfit) {
    matrixBoxNetProfit.textContent = `${data.netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
    matrixBoxNetProfit.className = `text-xl sm:text-2xl font-black block mt-1 ${data.netProfit < 0 ? 'text-rose-600' : 'text-slate-900'}`;
  }
  if (matrixBoxTotalDeductions) matrixBoxTotalDeductions.textContent = `${data.grandTotalDeductions.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

  // HTML Tablo Üretimi
  let html = `<thead><tr class="border-b border-slate-400">`;
  html += `<th class="sticky left-0 z-20 bg-amber-300 text-slate-900 font-black text-xs py-2 px-3 border border-slate-400 min-w-[180px] text-left uppercase shadow-xs">AD SOYAD</th>`;

  data.columns.forEach(col => {
    html += `<th class="bg-amber-300 text-slate-900 font-extrabold text-[11px] py-1.5 px-1 border border-slate-400 min-w-[50px] whitespace-nowrap text-center">${col.displayDate}</th>`;
  });

  html += `<th class="bg-slate-300 text-slate-900 font-black text-xs py-2 px-2 border border-slate-400 min-w-[75px] text-center">TOPLAM</th>`;
  html += `<th class="bg-white text-rose-700 font-black text-xs py-2 px-2 border border-slate-400 min-w-[95px] text-center">KESİLECEK PARA</th>`;
  html += `<th class="bg-slate-200 text-slate-900 font-black text-xs py-2 px-2 border border-slate-400 min-w-[95px] text-right">ÇARPIM</th>`;
  html += `<th class="bg-amber-300 text-slate-900 font-black text-xs py-2 px-2 border border-slate-400 min-w-[105px] text-right">ÖDENECEK PARA</th>`;
  html += `</tr></thead><tbody>`;

  const totalColSpan = data.columns.length + 5;
  let currentBolge = null;

  data.rows.forEach(r => {
    // Bölge Başlığı
    if (r.bolge !== currentBolge) {
      currentBolge = r.bolge;
      html += `
        <tr class="bg-slate-200 text-slate-900 font-black text-xs border border-slate-400">
          <td colspan="${totalColSpan}" class="py-2 px-4 text-left uppercase tracking-wider bg-slate-200 border border-slate-400 font-black text-slate-900">
            📍 ${escapeHtml(currentBolge)}
          </td>
        </tr>
      `;
    }

    html += `<tr class="hover:bg-amber-50/50 transition-colors border-b border-slate-200">`;
    // Üretici Adı
    html += `
      <td class="sticky left-0 z-10 bg-white font-bold text-slate-900 border border-slate-300 px-3 py-1.5 text-left whitespace-nowrap shadow-xs">
        <span class="inline-block bg-amber-300 text-slate-900 px-1.5 py-0.5 rounded text-[11px] font-black mr-1.5">${escapeHtml(r.cust.adSoyad)}</span>
      </td>
    `;

    // Günler
    data.columns.forEach(col => {
      const val = r.dayValues[col.fullDate] || 0;
      html += `
        <td 
          class="matrix-cell border border-slate-300 p-1 text-center font-bold text-slate-800 cursor-pointer hover:bg-emerald-100 active:scale-95 transition"
          data-type="milk"
          data-cust-user="${r.cust.kullaniciAdi}"
          data-cust-name="${escapeHtml(r.cust.adSoyad)}"
          data-date="${col.fullDate}"
          data-day="${col.dayStr}"
          data-val="${val}"
          title="${escapeHtml(r.cust.adSoyad)} - ${col.displayDate} (Tıkla ve düzenle)"
        >
          ${val > 0 ? val : ""}
        </td>
      `;
    });

    // Toplam
    html += `<td class="bg-slate-200 font-black text-slate-900 border border-slate-300 py-1.5 px-2 text-center text-xs">${r.rowTotalMilk > 0 ? r.rowTotalMilk : "0"}</td>`;

    // Kesilecek Para
    html += `
      <td 
        class="matrix-cell border border-slate-300 py-1.5 px-2 text-right font-black text-rose-700 cursor-pointer hover:bg-rose-50 active:scale-95 transition text-xs"
        data-type="deduction"
        data-cust-user="${r.cust.kullaniciAdi}"
        data-cust-name="${escapeHtml(r.cust.adSoyad)}"
        data-val="${r.deduction}"
        title="Kesilecek parayı (avans) değiştirmek için tıkla"
      >
        ${r.deduction > 0 ? r.deduction.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : ""}
      </td>
    `;

    // Çarpım
    html += `<td class="bg-slate-100 font-black text-slate-900 border border-slate-300 py-1.5 px-2 text-right text-xs">${r.carpim.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>`;

    // Ödenecek Para
    const isNegative = r.payable < 0;
    html += `<td class="border border-slate-300 py-1.5 px-2 text-right text-xs font-black ${isNegative ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-slate-900'}">${r.payable.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>`;

    html += `</tr>`;
  });

  // ========================================================================
  // ALT TOPLAM SATIRLARI (TOPLAM SÜT & KANTAR)
  // ========================================================================
  // 1. TOPLAM SÜT (Kırmızı Zemin)
  html += `
    <tr class="bg-red-600 text-white font-black text-xs border border-red-700">
      <td class="sticky left-0 z-10 bg-red-600 text-white px-3 py-2 text-left uppercase font-black border border-red-700 shadow-xs">
        TOPLAM SÜT
      </td>
  `;
  data.columns.forEach(col => {
    const dayTot = data.dayColumnTotals[col.fullDate] || 0;
    html += `<td class="border border-red-700 p-1 text-center font-black">${dayTot > 0 ? dayTot : "0"}</td>`;
  });
  html += `
      <td class="bg-red-700 text-white font-black py-2 px-2 text-center border border-red-800">${data.grandTotalMilk.toLocaleString("tr-TR")} KG</td>
      <td class="bg-red-700 text-white font-black py-2 px-2 text-right border border-red-800">${data.grandTotalDeductions > 0 ? data.grandTotalDeductions.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "0.00"} TL</td>
      <td class="bg-red-700 text-white font-black py-2 px-2 text-right border border-red-800">${data.grandTotalCarpim.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>
      <td class="bg-red-800 text-white font-black py-2 px-2 text-right border border-red-900">${data.grandTotalPayable.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>
    </tr>
  `;

  // 2. KANTAR (Sarı Zemin)
  html += `
    <tr class="bg-yellow-400 text-slate-900 font-black text-xs border border-yellow-500">
      <td class="sticky left-0 z-10 bg-yellow-400 text-slate-900 px-3 py-2 text-left uppercase font-black border border-yellow-500 shadow-xs">
        KANTAR
      </td>
  `;
  data.columns.forEach(col => {
    const kantarVal = data.dayKantarTotals[col.fullDate] || 0;
    html += `
      <td 
        class="matrix-cell border border-yellow-500 p-1 text-center font-black cursor-pointer hover:bg-yellow-300 active:scale-95 transition"
        data-type="kantar"
        data-date="${col.fullDate}"
        data-day="${col.dayStr}"
        data-val="${kantarVal}"
        title="Kantar değerini düzenlemek için tıkla"
      >
        ${kantarVal > 0 ? kantarVal : ""}
      </td>
    `;
  });
  html += `
      <td class="bg-yellow-500 text-slate-900 font-black py-2 px-2 text-center border border-yellow-600">${data.grandTotalKantar.toLocaleString("tr-TR")} KG</td>
      <td colspan="3" class="bg-yellow-400 border border-yellow-500 text-right pr-3 font-extrabold text-[11px] text-slate-800">
        Fabrika Geliri: ${data.factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
      </td>
    </tr>
  `;

  html += `</tbody>`;
  matrixTable.innerHTML = html;

  // Hücre tıklama dinleyicilerini bağla
  matrixTable.querySelectorAll(".matrix-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      const type = cell.dataset.type;
      const custUser = cell.dataset.custUser;
      const custName = cell.dataset.custName;
      const dateStr = cell.dataset.date;
      const currentVal = cell.dataset.val || "0";
      openCellModal(type, { kullaniciAdi: custUser, adSoyad: custName }, dateStr, currentVal);
    });
  });
}

function openCellModal(type, cust, dateStr, currentVal) {
  activeCellEdit = { type, cust, dateStr, currentVal };
  if (!matrixCellModal) return;

  if (type === "milk") {
    cellModalTitle.textContent = `${cust.adSoyad} - Süt Miktarı`;
    cellModalLabel.textContent = `${formatDisplayDate(dateStr)} Tarihindeki Süt (Litre/KG):`;
    cellModalInput.value = currentVal > 0 ? currentVal : "";
    cellModalHint.textContent = "Örn: 27 (Boşaltmak için 0 girin)";
  } else if (type === "deduction") {
    cellModalTitle.textContent = `${cust.adSoyad} - Kesilecek Para`;
    cellModalLabel.textContent = "Avans / Yem / Masraf Kesintisi (₺):";
    cellModalInput.value = currentVal > 0 ? currentVal : "";
    cellModalHint.textContent = "Örn: 1300.00";
  } else if (type === "kantar") {
    cellModalTitle.textContent = "Kantar Süt Miktarı";
    cellModalLabel.textContent = `${formatDisplayDate(dateStr)} Tarihli Kantar Sütü (Litre/KG):`;
    cellModalInput.value = currentVal > 0 ? currentVal : "";
    cellModalHint.textContent = "Örn: 2651";
  }

  matrixCellModal.classList.remove("hidden");
  setTimeout(() => cellModalInput.focus(), 50);
}

function closeCellModal() {
  activeCellEdit = null;
  if (matrixCellModal) matrixCellModal.classList.add("hidden");
}

async function handleSaveCellModal(e) {
  e.preventDefault();
  if (!activeCellEdit) return;

  const newVal = parseFloat(cellModalInput.value) || 0;
  const { type, cust, dateStr } = activeCellEdit;

  try {
    if (type === "milk") {
      localStorage.setItem(`matrix_milk_${cust.kullaniciAdi}_${dateStr}`, newVal);

      // Firestore'a da kaydet / güncelle
      const existingLog = allCustomerLogs.find(l => 
        l.tarih === dateStr && 
        (l.musteriKullaniciAdi === cust.kullaniciAdi || l.adSoyad.toLowerCase() === cust.adSoyad.toLowerCase())
      );

      const tutar = +(newVal * publicPrice).toFixed(2);
      if (existingLog) {
        await setDoc(doc(db, COL_CUSTOMER_LOGS, existingLog.id), {
          miktar: newVal,
          tutar: tutar,
          guncellendiAt: serverTimestamp()
        }, { merge: true });
      } else if (newVal > 0) {
        await addDoc(collection(db, COL_CUSTOMER_LOGS), {
          musteriKullaniciAdi: cust.kullaniciAdi,
          adSoyad: cust.adSoyad,
          tarih: dateStr,
          miktar: newVal,
          birimFiyat: publicPrice,
          tutar: tutar,
          odendi: false,
          not: "Excel çizelgesi üzerinden girildi",
          olusturulduAt: serverTimestamp()
        });
      }

      showToast(`${cust.adSoyad} için süt miktarı ${newVal} LT olarak kaydedildi!`, "success");

    } else if (type === "deduction") {
      localStorage.setItem(`matrix_deduct_${cust.kullaniciAdi}`, newVal);

      const matchedCust = allCustomers.find(c => c.kullaniciAdi === cust.kullaniciAdi || c.adSoyad.toLowerCase() === cust.adSoyad.toLowerCase());
      if (matchedCust) {
        await setDoc(doc(db, COL_USERS, matchedCust.id), {
          kesilecekPara: newVal
        }, { merge: true });
      }

      showToast(`${cust.adSoyad} için kesilecek para ${newVal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ olarak güncellendi!`, "success");

    } else if (type === "kantar") {
      localStorage.setItem(`matrix_kantar_${dateStr}`, newVal);

      const existingRecord = allRecords.find(r => r.tarih === dateStr);
      if (existingRecord) {
        await setDoc(doc(db, COL_RECORDS, existingRecord.id), {
          fabrikaSut: newVal,
          fabrikaGelir: +(newVal * (existingRecord.fabrikaFiyat || factoryPrice)).toFixed(2)
        }, { merge: true });
      }

      showToast(`${formatDisplayDate(dateStr)} kantar sütü ${newVal} LT olarak kaydedildi!`, "success");
    }

    closeCellModal();
    renderMatrixTable();
  } catch (err) {
    showToast("Kayıt güncellenirken hata: " + err.message, "error");
    closeCellModal();
    renderMatrixTable();
  }
}

// PDF ve Yazdırma Fonksiyonu (Landscape A4)
function handleMatrixExportPdf() {
  const data = getMatrixData();
  if (!excelMatrixPrintArea) return;

  const monthName = matrixMonthSelect ? matrixMonthSelect.options[matrixMonthSelect.selectedIndex].text : "Ekim";
  const yyyy = matrixYearSelect ? matrixYearSelect.value : "2026";
  const startD = data.columns[0]?.dayStr || "16";
  const endD = data.columns[data.columns.length - 1]?.dayStr || "31";

  let printHtml = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; width: 100%; color: #0f172a; padding: 5px;">
      
      <!-- Başlık & Çiftlik Bilgisi -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div>
          <h1 style="font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase;">ÇİFTLİK SÜT TOPLAMA & ÜRETİCİ HAKEDİŞ ÇİZELGESİ</h1>
          <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">
            Dönem: <strong>${startD}.${matrixMonthSelect?.value || '10'}.${yyyy} - ${endD}.${matrixMonthSelect?.value || '10'}.${yyyy}</strong> &bull; Süt Alış Birim Fiyatı: <strong>${data.unitPrice.toFixed(2)} ₺/LT</strong>
          </p>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
          <div>Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}</div>
          <div style="font-weight: 800; color: #166534;">Çiftlik Süt Yönetim Portalı</div>
        </div>
      </div>

      <!-- Tablo Klonu -->
      <div style="width: 100%; overflow: visible;">
        ${matrixTable.outerHTML}
      </div>

      <!-- Alt Finansal Özet Kutuları -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;">
        <div style="background: #ffe4e6; border: 1px solid #fda4af; padding: 8px; border-radius: 8px; text-align: center;">
          <div style="font-size: 9px; font-weight: 800; color: #9f1239; text-transform: uppercase;">GELEN PARA (FABRİKA GELİRİ)</div>
          <div style="font-size: 14px; font-weight: 900; color: #881337; margin-top: 2px;">${data.factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
        </div>
        <div style="background: #ffe4e6; border: 1px solid #fda4af; padding: 8px; border-radius: 8px; text-align: center;">
          <div style="font-size: 9px; font-weight: 800; color: #9f1239; text-transform: uppercase;">ÖDENEN / ÖDENECEK PARA</div>
          <div style="font-size: 14px; font-weight: 900; color: #881337; margin-top: 2px;">${data.grandTotalPayable.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
        </div>
        <div style="background: #ffffff; border: 2px solid #cbd5e1; padding: 8px; border-radius: 8px; text-align: center;">
          <div style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase;">KALAN KÂR / BAKİYE</div>
          <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${data.netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
        </div>
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 8px; border-radius: 8px; text-align: center;">
          <div style="font-size: 9px; font-weight: 800; color: #92400e; text-transform: uppercase;">KESİLECEK PARA TOPLAMI</div>
          <div style="font-size: 14px; font-weight: 900; color: #78350f; margin-top: 2px;">${data.grandTotalDeductions.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
        </div>
      </div>

    </div>
  `;

  excelMatrixPrintArea.innerHTML = printHtml;
  excelMatrixPrintArea.classList.remove("hidden");

  if (window.html2pdf) {
    showToast("PDF dosyası oluşturuluyor ve indiriliyor...", "info", 3000);
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `Senlik_Ciftligi_Sut_Cizelgesi_${monthName}_${yyyy}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(excelMatrixPrintArea).save().then(() => {
      excelMatrixPrintArea.classList.add("hidden");
      showToast("PDF çizelgesi başarıyla indirildi!", "success");
    }).catch(err => {
      console.warn("html2pdf hatası:", err);
      excelMatrixPrintArea.classList.add("hidden");
      window.print();
    });
  } else {
    window.print();
  }
}

// Excel (.csv) İndirme Fonksiyonu (UTF-8 BOM ile Excel'de Sorunsuz Açılır)
function handleMatrixExportExcel() {
  const data = getMatrixData();
  const yyyy = matrixYearSelect ? matrixYearSelect.value : "2026";
  const mm = matrixMonthSelect ? matrixMonthSelect.value : "10";

  let csv = "";
  // Başlık satırı
  const headers = ["BÖLGE", "AD SOYAD"];
  data.columns.forEach(col => headers.push(col.displayDate));
  headers.push("TOPLAM (KG)", "KESİLECEK PARA (TL)", "ÇARPIM (TL)", "ÖDENECEK PARA (TL)");
  csv += headers.map(h => `"${h}"`).join(";") + "\r\n";

  // Veri satırları
  let currentBolge = null;
  data.rows.forEach(r => {
    if (r.bolge !== currentBolge) {
      currentBolge = r.bolge;
      csv += `"[BÖLGE: ${currentBolge}]"` + ";".repeat(headers.length - 1) + "\r\n";
    }

    const rowItems = [
      `"${r.bolge}"`,
      `"${r.cust.adSoyad}"`
    ];

    data.columns.forEach(col => {
      const val = r.dayValues[col.fullDate] || 0;
      rowItems.push(val > 0 ? val : "");
    });

    rowItems.push(
      r.rowTotalMilk,
      r.deduction.toFixed(2).replace(".", ","),
      r.carpim.toFixed(2).replace(".", ","),
      r.payable.toFixed(2).replace(".", ",")
    );

    csv += rowItems.join(";") + "\r\n";
  });

  // Toplam Süt satırı
  const milkTotRow = ['"TOPLAM SÜT"', '""'];
  data.columns.forEach(col => {
    milkTotRow.push(data.dayColumnTotals[col.fullDate] || 0);
  });
  milkTotRow.push(
    data.grandTotalMilk,
    data.grandTotalDeductions.toFixed(2).replace(".", ","),
    data.grandTotalCarpim.toFixed(2).replace(".", ","),
    data.grandTotalPayable.toFixed(2).replace(".", ",")
  );
  csv += milkTotRow.join(";") + "\r\n";

  // Kantar Satırı
  const kantarRow = ['"KANTAR"', '""'];
  data.columns.forEach(col => {
    kantarRow.push(data.dayKantarTotals[col.fullDate] || 0);
  });
  kantarRow.push(data.grandTotalKantar, '""', '""', `"${data.factoryIncome.toFixed(2).replace(".", ",")} TL (Fabrika Geliri)"`);
  csv += kantarRow.join(";") + "\r\n";

  // Özet Satırları
  csv += "\r\n";
  csv += `"GELEN PARA (FABRİKA GELİRİ)";"${data.factoryIncome.toFixed(2).replace(".", ",")} TL"\r\n`;
  csv += `"ÖDENEN / ÖDENECEK PARA";"${data.grandTotalPayable.toFixed(2).replace(".", ",")} TL"\r\n`;
  csv += `"KALAN KÂR / BAKİYE";"${data.netProfit.toFixed(2).replace(".", ",")} TL"\r\n`;
  csv += `"KESİLECEK PARA TOPLAMI";"${data.grandTotalDeductions.toFixed(2).replace(".", ",")} TL"\r\n`;

  // UTF-8 BOM ekle ki Excel Türkçe karakterleri doğru göstersin
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ciftlik_Sut_Cizelgesi_${mm}_${yyyy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Excel dosyası başarıyla indirildi!", "success");
}

function handleMatrixExportEmail() {
  openEmailModal();
  const matrixRadio = document.querySelector('input[name="reportFrequency"][value="matrix"]');
  if (matrixRadio) {
    matrixRadio.checked = true;
    updateReportPreview();
  }
}

// Excel Fotoğrafındaki Tüm Üreticileri Otomatik Yükleme Sihirbazı
async function handleMatrixSeedData() {
  if (!confirm("Excel tablosundaki tüm üreticileri (Velimeşe, Kapaklı, Eflaim, Sütçüler) ve örnek süt kayıtlarını sisteme aktarmak istiyor musunuz?")) {
    return;
  }

  showToast("Excel üreticileri ve verileri yükleniyor...", "info");

  try {
    for (const item of EXCEL_SEED_DATA) {
      const username = item.adSoyad.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const existing = allCustomers.find(c => c.kullaniciAdi === username || c.adSoyad.toLowerCase() === item.adSoyad.toLowerCase());

      let custId = existing ? existing.id : null;
      if (!existing) {
        const docRef = await addDoc(collection(db, COL_USERS), {
          adSoyad: item.adSoyad,
          kullaniciAdi: username,
          email: `${username}@ciftlik.com`,
          sifre: "123",
          telefon: "",
          bolge: item.bolge,
          kesilecekPara: item.kesilecekPara || 0,
          rol: "musteri",
          olusturulduAt: serverTimestamp()
        });
        custId = docRef.id;
      } else {
        await setDoc(doc(db, COL_USERS, existing.id), {
          bolge: item.bolge,
          kesilecekPara: item.kesilecekPara || 0
        }, { merge: true });
      }

      // Günlük süt kayıtlarını işle (16-22 Ekim)
      if (item.days) {
        for (const [dayNum, amount] of Object.entries(item.days)) {
          const dateStr = `2026-10-${dayNum.padStart(2, "0")}`;
          localStorage.setItem(`matrix_milk_${username}_${dateStr}`, amount);

          // log olarak ekle
          const existingLog = allCustomerLogs.find(l => l.tarih === dateStr && l.musteriKullaniciAdi === username);
          if (!existingLog && amount > 0) {
            await addDoc(collection(db, COL_CUSTOMER_LOGS), {
              musteriKullaniciAdi: username,
              adSoyad: item.adSoyad,
              tarih: dateStr,
              miktar: amount,
              birimFiyat: 24.30,
              tutar: +(amount * 24.30).toFixed(2),
              odendi: false,
              olusturulduAt: serverTimestamp()
            });
          }
        }
      }
    }

    // Kantar değerlerini kaydet
    for (const [dayNum, kantarVal] of Object.entries(EXCEL_SEED_KANTAR)) {
      const dateStr = `2026-10-${dayNum.padStart(2, "0")}`;
      localStorage.setItem(`matrix_kantar_${dateStr}`, kantarVal);
    }

    showToast("Excel üreticileri ve çizelge verileri başarıyla sisteme aktarıldı!", "success");
    renderMatrixTable();
  } catch (err) {
    showToast("Veri aktarımı sırasında hata: " + err.message, "error");
    renderMatrixTable();
  }
}

// ============================================================================
// 11. MÜŞTERİ / ÜRETİCİ PORTALI (TAMAMEN SALT OKUNUR & KİŞİSEL TAKİP)
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

function updateCustomerPortalStats() {
  const totalMilk = myCustomerLogs.reduce((acc, l) => acc + (Number(l.miktar) || 0), 0);
  const totalMoney = myCustomerLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * (l.birimFiyat || publicPrice))), 0);
  const totalPaid = myCustomerLogs.filter(l => l.odendi).reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * (l.birimFiyat || publicPrice))), 0);
  const remainingDebt = +(totalMoney - totalPaid).toFixed(2);

  if (custTotalMilk) custTotalMilk.textContent = totalMilk.toLocaleString("tr-TR");
  if (custTotalMoney) custTotalMoney.textContent = totalMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  if (custPaidMoney) custPaidMoney.textContent = totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  if (custPendingMoney) custPendingMoney.textContent = remainingDebt.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
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

    const dateStr = formatDisplayDate(log.tarih);
    const price = log.birimFiyat || publicPrice;
    const tutar = Number(log.tutar) || (Number(log.miktar) * price);
    const isPaid = !!log.odendi;

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">${dateStr}</td>
      <td class="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">${Number(log.miktar).toLocaleString("tr-TR")} LT</td>
      <td class="py-3 px-3 whitespace-nowrap text-xs text-slate-500">${price.toFixed(2)} ₺ / LT</td>
      <td class="py-3 px-3 font-extrabold text-indigo-700 whitespace-nowrap">${tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
      <td class="py-3 px-3 whitespace-nowrap">
        ${isPaid 
          ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Ödendi</span>` 
          : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">⏳ Ödenmedi (Alacak)</span>`}
      </td>
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
      if (activeModalCustomer) {
        renderCustomerPaymentModalRecords();
      }
    });
  } catch (err) {
    console.error("Müşteri logları dinlenemedi:", err);
  }
}

// ============================================================================
// 12. E-POSTA RAPORLAMA YÖNETİMİ (GÜNLÜK & AYLIK DETAYLI RAPOR)
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
  const freq = document.querySelector('input[name="reportFrequency"]:checked')?.value || "daily";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const currentMonthStr = `${yyyy}-${mm}`;

  if (freq === "matrix") {
    const data = getMatrixData();
    previewReportTitle.textContent = `Aylık Excel Çizelgesi Tablosu`;
    previewReportDate.textContent = `${now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}`;

    previewTotalMilk.textContent = `${data.grandTotalMilk.toLocaleString("tr-TR")} LT`;
    previewFactoryMoney.textContent = `${data.factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
    previewPublicMoney.textContent = `${data.grandTotalPayable.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
    previewNetProfit.textContent = `${data.netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

    if (previewPaidMoney) previewPaidMoney.textContent = `Kesinti: ${data.grandTotalDeductions.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
    if (previewDebtMoney) previewDebtMoney.textContent = `Kantar: ${data.grandTotalKantar.toLocaleString("tr-TR")} KG`;

    if (previewProducersList) {
      previewProducersList.innerHTML = "";
      data.rows.forEach(r => {
        const row = document.createElement("div");
        row.className = "flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs";
        row.innerHTML = `
          <div>
            <span class="text-[10px] bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-600 mr-1">${escapeHtml(r.bolge)}</span>
            <strong class="text-slate-800">${escapeHtml(r.cust.adSoyad)}</strong>
            <span class="text-slate-400 text-[10px] block">Top: ${r.rowTotalMilk} LT &bull; Kesinti: ${r.deduction.toLocaleString("tr-TR")} ₺</span>
          </div>
          <div class="text-right">
            <span class="font-black text-slate-900 block">${r.payable.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
            <span class="text-[10px] text-slate-400">Brüt: ${r.carpim.toLocaleString("tr-TR")} ₺</span>
          </div>
        `;
        previewProducersList.appendChild(row);
      });
    }

    return { freq, data };
  }

  const isMonthly = freq === "monthly";
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
    acc.factoryMilk += Number(r.fabrikaSut) || 0;
    acc.factoryMoney += Number(r.fabrikaGelir || (Number(r.fabrikaSut) * (r.fabrikaFiyat || factoryPrice))) || 0;
    acc.publicMoney += Number(r.halkaOdenecekPara) || 0;
    return acc;
  }, { milk: 0, factoryMilk: 0, factoryMoney: 0, publicMoney: 0 });

  // Bu dönemdeki üreticileri topla
  const producerMap = {};
  filtered.forEach(r => {
    if (Array.isArray(r.halkUreticiler)) {
      r.halkUreticiler.forEach(p => {
        const key = p.adSoyad;
        if (!producerMap[key]) {
          producerMap[key] = {
            adSoyad: p.adSoyad,
            miktar: 0,
            tutar: 0,
            odendiTutar: 0,
            borcTutar: 0
          };
        }
        producerMap[key].miktar += Number(p.miktar) || 0;
        producerMap[key].tutar += Number(p.tutar) || 0;
        if (p.odendi) {
          producerMap[key].odendiTutar += Number(p.tutar) || 0;
        } else {
          producerMap[key].borcTutar += Number(p.tutar) || 0;
        }
      });
    }
  });

  const producerList = Object.values(producerMap);
  const totalPaid = producerList.reduce((acc, p) => acc + p.odendiTutar, 0);
  const totalDebt = producerList.reduce((acc, p) => acc + p.borcTutar, 0);
  const netProfit = +(totals.factoryMoney - totals.publicMoney).toFixed(2);

  previewTotalMilk.textContent = `${totals.milk.toLocaleString("tr-TR")} LT`;
  previewFactoryMoney.textContent = `${totals.factoryMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  previewPublicMoney.textContent = `${totals.publicMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  previewNetProfit.textContent = `${netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

  if (previewPaidMoney) previewPaidMoney.textContent = `${totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;
  if (previewDebtMoney) previewDebtMoney.textContent = `${totalDebt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`;

  // Önizleme Üretici Listesi
  if (previewProducersList) {
    previewProducersList.innerHTML = "";
    if (producerList.length === 0) {
      previewProducersList.innerHTML = `
        <div class="text-slate-400 italic text-[11px] py-2 text-center bg-white rounded-xl border border-dashed border-slate-200">
          Bu dönem için üretici teslimat kaydı bulunamadı.
        </div>
      `;
    } else {
      producerList.forEach(prod => {
        const row = document.createElement("div");
        row.className = "flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs";
        row.innerHTML = `
          <div>
            <strong class="text-slate-800">${escapeHtml(prod.adSoyad)}</strong>
            <span class="text-slate-400 text-[10px] block">${prod.miktar.toLocaleString("tr-TR")} LT &bull; ${prod.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
          </div>
          <div class="text-right">
            <span class="inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${prod.borcTutar === 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
              ${prod.borcTutar === 0 ? '✓ Ödendi' : `Borç: ${prod.borcTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
            </span>
          </div>
        `;
        previewProducersList.appendChild(row);
      });
    }
  }

  return { freq, isMonthly, totals, netProfit, totalPaid, totalDebt, producerList, filtered };
}

function getFormattedReportText() {
  const reportData = updateReportPreview();
  if (reportData.freq === "matrix") {
    const { data } = reportData;
    let tableText = "BÖLGE | ÜRETİCİ | TOPLAM SÜT | KESİLECEK PARA | ÇARPIM | ÖDENECEK PARA\n";
    tableText += "--------------------------------------------------------------------------------\n";
    data.rows.forEach(r => {
      tableText += `[${r.bolge}] ${r.cust.adSoyad} | ${r.rowTotalMilk} KG | ${r.deduction.toFixed(2)} TL | ${r.carpim.toFixed(2)} TL | ${r.payable.toFixed(2)} TL\n`;
    });
    tableText += "--------------------------------------------------------------------------------\n";
    tableText += `TOPLAM SÜT: ${data.grandTotalMilk} KG | KESİLECEK: ${data.grandTotalDeductions.toFixed(2)} TL | BRÜT: ${data.grandTotalCarpim.toFixed(2)} TL | ÖDENECEK: ${data.grandTotalPayable.toFixed(2)} TL\n`;
    tableText += `KANTAR SÜTÜ: ${data.grandTotalKantar} KG | FABRİKA SATIŞ GELİRİ: ${data.factoryIncome.toFixed(2)} TL\n`;

    const subject = `Şenlik Çiftliği Süt Toplama & Hakediş Çizelgesi Tablosu (${new Date().toLocaleDateString("tr-TR")})`;
    const body = `Sayın Çiftlik Yöneticisi,

==================================================
ÇİFTLİK SÜT TOPLAMA & HAKEDİŞ ÇİZELGESİ (EXCEL RAPORU)
Tarih: ${new Date().toLocaleDateString("tr-TR")}
Süt Alış Birim Fiyatı: ${data.unitPrice.toFixed(2)} TL / LT
==================================================

1. FİNANSAL TABLO ÖZETİ:
--------------------------------------------------
🏭 GELEN PARA (Fabrika Geliri): ${data.factoryIncome.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
👥 ÖDENEN / ÖDENECEK PARA (Halka Net): ${data.grandTotalPayable.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
💰 KALAN KÂR / BAKİYE: ${data.netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
✂️ KESİLECEK PARA TOPLAMI (Avans/Yem): ${data.grandTotalDeductions.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
🥛 TOPLANAN TOPLAM SÜT: ${data.grandTotalMilk.toLocaleString("tr-TR")} KG
⚖️ TOPLAM KANTAR SÜTÜ: ${data.grandTotalKantar.toLocaleString("tr-TR")} KG

--------------------------------------------------
2. BÖLGE VE ÜRETİCİ BAZLI ÇİZELGE DETAYI:
--------------------------------------------------
${tableText}

Bu rapor Şenlik Çiftliği Süt Takip Sistemi tarafından otomatik oluşturulmuştur.`;

    return { subject, body };
  }

  const { isMonthly, totals, netProfit, totalPaid, totalDebt, producerList } = reportData;
  const periodText = isMonthly ? "Aylık" : "Günlük";
  const subject = `Şenlik Çiftliği Süt ve Finans ${periodText} Raporu (${new Date().toLocaleDateString("tr-TR")})`;

  let producerText = "Bu dönem için üretici teslimatı bulunmuyor.";
  if (producerList && producerList.length > 0) {
    producerText = producerList.map((p, idx) => {
      const status = p.borcTutar === 0 ? "[ÖDENDİ]" : `[ÖDENMEDİ - Kalan Borç: ${p.borcTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL]`;
      return `${idx + 1}. ${p.adSoyad}: ${p.miktar.toLocaleString("tr-TR")} LT -> Toplam: ${p.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL | Durum: ${status}`;
    }).join("\n");
  }

  const body = `Sayın Çiftlik Yöneticisi,

==================================================
ŞENLİK ÇİFTLİĞİ SÜT & FİNANS ${periodText.toUpperCase()} RAPORU
Tarih: ${new Date().toLocaleDateString("tr-TR")}
==================================================

1. GENEL FİNANSAL ÖZET:
--------------------------------------------------
🥛 Toplanan Toplam Süt (Üretim): ${totals.milk.toLocaleString("tr-TR")} Litre
🏭 Fabrikaya Satılan Süt: ${totals.factoryMilk.toLocaleString("tr-TR")} Litre
🏭 Fabrika Satış Geliri: ${totals.factoryMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
👥 Halka / Üreticilere Toplam Borç: ${totals.publicMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
   - Halka Ödenen Tutar: ${totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
   - Halka Kalan Borç: ${totalDebt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
💰 Net Çiftlik Kârı: ${netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL

--------------------------------------------------
2. ÜRETİCİ / KÖYLÜ BAZLI SÜT VE ÖDEME LİSTESİ:
--------------------------------------------------
${producerText}

--------------------------------------------------
3. FABRİKA SATIŞ DETAYI:
--------------------------------------------------
- Alıcı: Fabrika
- Satılan Miktar: ${totals.factoryMilk.toLocaleString("tr-TR")} Litre
- Satış Birim Fiyatı: ${factoryPrice.toFixed(2)} TL / LT
- Toplam Alacak / Tahsilat: ${totals.factoryMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
==================================================

Bu rapor Şenlik Çiftliği Süt Takip Sistemi tarafından otomatik olarak oluşturulmuştur.`;

  return { subject, body };
}

function handleCopyReportText() {
  const { body } = getFormattedReportText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(body).then(() => {
      showToast("Rapor metni panoya kopyalandı! İstediğiniz e-posta veya WhatsApp mesajına yapıştırabilirsiniz.", "success");
    }).catch(() => {
      showToast("Metin panoya kopyalanamadı.", "warning");
    });
  } else {
    showToast("Panoya kopyalama bu tarayıcıda desteklenmiyor.", "warning");
  }
}

function handleDownloadModalPdf() {
  const reportData = updateReportPreview();
  if (reportData.freq === "matrix") {
    handleMatrixExportPdf();
    return;
  }

  const { isMonthly, totals, netProfit, totalPaid, totalDebt, producerList } = reportData;
  const periodText = isMonthly ? "Aylik" : "Gunluk";
  const periodTitle = isMonthly ? "Aylık Çiftlik Raporu" : "Günlük Çiftlik Raporu";
  const dateStr = new Date().toLocaleDateString("tr-TR");

  let producerRowsHtml = "";
  if (producerList && producerList.length > 0) {
    producerRowsHtml = producerList.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${escapeHtml(p.adSoyad)}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #047857;">${p.miktar.toLocaleString("tr-TR")} LT</td>
        <td style="padding: 6px 8px; text-align: right; color: #0f172a;">${p.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
        <td style="padding: 6px 8px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 10px; ${p.borcTutar === 0 ? 'background: #dcfce7; color: #166534;' : 'background: #ffe4e6; color: #9f1239;'}">
            ${p.borcTutar === 0 ? '✓ Ödendi' : `Borç: ${p.borcTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
          </span>
        </td>
      </tr>
    `).join("");
  } else {
    producerRowsHtml = `
      <tr>
        <td colspan="5" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">
          Bu dönem için kayıtlı üretici teslimatı bulunmamaktadır.
        </td>
      </tr>
    `;
  }

  const reportContainer = document.createElement("div");
  reportContainer.style.padding = "20px";
  reportContainer.style.background = "#ffffff";
  reportContainer.style.color = "#0f172a";
  reportContainer.style.fontFamily = "'Plus Jakarta Sans', Arial, sans-serif";

  reportContainer.innerHTML = `
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #166534;">ŞENLİK BESİ VE ÜRETİM ÇİFTLİĞİ</h1>
        <h2 style="font-size: 13px; font-weight: 700; margin: 3px 0 0 0; color: #334155;">${periodTitle} &bull; Süt Toplama & Finans Özeti</h2>
      </div>
      <div style="text-align: right; font-size: 11px; color: #64748b;">
        <div>Tarih: <strong>${dateStr}</strong></div>
        <div>Yanıkağıl / Kapaklı - Tekirdağ</div>
      </div>
    </div>

    <!-- 4 Finansal Özet Kutusu -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px;">
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; text-align: center;">
        <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Toplanan Süt</div>
        <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px;">${totals.milk.toLocaleString("tr-TR")} LT</div>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 10px; border-radius: 8px; text-align: center;">
        <div style="font-size: 10px; font-weight: bold; color: #166534; text-transform: uppercase;">Fabrika Satış Geliri</div>
        <div style="font-size: 16px; font-weight: 900; color: #15803d; margin-top: 4px;">${totals.factoryMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
      </div>
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 8px; text-align: center;">
        <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase;">Halka Ödenecek</div>
        <div style="font-size: 16px; font-weight: 900; color: #b45309; margin-top: 4px;">${totals.publicMoney.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
      </div>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; text-align: center;">
        <div style="font-size: 10px; font-weight: bold; color: #1d4ed8; text-transform: uppercase;">Net Çiftlik Kârı</div>
        <div style="font-size: 16px; font-weight: 900; color: #1e40af; margin-top: 4px;">${netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
      </div>
    </div>

    <!-- Halka Ödenen ve Borç Çubuğu -->
    <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; font-size: 11px; margin-bottom: 15px;">
      <div><span style="color: #64748b;">Halka Ödenen Tutar:</span> <strong style="color: #15803d; font-size: 12px;">${totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</strong></div>
      <div><span style="color: #64748b;">Halka Kalan Borç:</span> <strong style="color: #b91c1c; font-size: 12px;">${totalDebt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</strong></div>
    </div>

    <!-- Üretici Teslimat Tablosu -->
    <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; color: #334155;">
      Üretici / Müşteri Teslimat ve Ödeme Listesi
    </h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
      <thead>
        <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 10px; color: #475569; text-transform: uppercase;">
          <th style="padding: 6px 8px; text-align: center; width: 35px;">No</th>
          <th style="padding: 6px 8px; text-align: left;">Üretici Ad Soyad</th>
          <th style="padding: 6px 8px; text-align: right;">Teslim Edilen (LT)</th>
          <th style="padding: 6px 8px; text-align: right;">Hakediş Tutarı (TL)</th>
          <th style="padding: 6px 8px; text-align: center; width: 110px;">Ödeme Durumu</th>
        </tr>
      </thead>
      <tbody>
        ${producerRowsHtml}
      </tbody>
    </table>

    <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
      <div>Şenlik Çiftliği Süt Takibi &bull; Otomatik Sistem Raporu</div>
      <div>Rapor Oluşturma Saati: ${new Date().toLocaleTimeString("tr-TR")}</div>
    </div>
  `;

  if (window.html2pdf) {
    showToast("PDF raporu oluşturuluyor ve indiriliyor...", "info", 3000);
    const opt = {
      margin: [6, 6, 6, 6],
      filename: `Senlik_Ciftligi_Rapor_${periodText}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(reportContainer).save().then(() => {
      showToast("PDF raporu başarıyla indirildi!", "success");
    }).catch(err => {
      console.warn("PDF indirme hatası:", err);
      window.print();
    });
  } else {
    window.print();
  }
}

function handleSendEmailReport(e) {
  e.preventDefault();
  const targetEmail = reportEmailInput.value.trim();
  if (!targetEmail) {
    showToast("Lütfen raporun gönderileceği e-posta adresini yazın.", "warning");
    return;
  }

  const { subject, body } = getFormattedReportText();

  // Otomatik panoya kopyala (kullanıcı kolayca her yere yapıştırabilsin)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(body).catch(() => {});
  }

  // Gmail Web Taslağını Doğrudan Yeni Sekmede Aç (İstemci gerekmez)
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const win = window.open(gmailUrl, "_blank");
  if (!win || win.closed || typeof win.closed === "undefined") {
    window.location.href = mailtoUrl;
  }

  closeEmailModal();
  showToast("Rapor panoya kopyalandı ve Gmail / E-posta taslağı açıldı!", "success", 5000);
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

/**
 * ISO Tarih formatını (YYYY-MM-DD) Türk formatı Gün.Ay.Yıl (DD.MM.YYYY) olarak biçimlendirir.
 */
function formatDisplayDate(isoDateStr) {
  if (!isoDateStr) return "-";
  try {
    const parts = String(isoDateStr).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
  } catch (e) {}
  return String(isoDateStr);
}

