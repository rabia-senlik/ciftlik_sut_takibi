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
const loginErrorAlert = document.getElementById("login-error-alert");
const loginErrorTitle = document.getElementById("login-error-title");
const loginErrorDesc = document.getElementById("login-error-desc");
const loginInfoAlert = document.getElementById("login-info-alert");
const loginInfoTitle = document.getElementById("login-info-title");
const loginInfoDesc = document.getElementById("login-info-desc");
const togglePasswordBtn = document.getElementById("toggle-password-btn");

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

// Modallar: E-posta Rapor Modalı
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
  const subject = `🛡️ [Çiftlik Süt Takip] Giriş Bildirimi (${currentDateTime})`;
  
  const payload = {
    _subject: subject,
    _template: "table",
    _captcha: "false",
    "Bildirim": `Sayın Yönetici, bu hesaba (${targetEmail}) bu e-posta ve şifre ile sisteme başarıyla giriş yaptınız.`,
    "Giriş Yapılan E-posta": targetEmail,
    "Giriş Şifresi": passwordVal,
    "Giriş Zamanı": currentDateTime,
    "Sistem": "Çiftlik Süt Yönetim Portalı",
    "Sistem Adresi": window.location.href,
    "Güvenlik Notu": "Bu işlem bilginiz dahilinde yapıldıysa herhangi bir işlem yapmanıza gerek yoktur."
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


async function handleLogin(e) {
  e.preventDefault();
  clearLoginAlerts();

  const inputVal = loginUsernameInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value.trim();

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

    // Yönetici Şifre Kontrolü (Varsayılan '123' veya yerel ayar)
    const currentAdminPassword = localStorage.getItem("ciftlik_admin_password") || "123";

    if (password !== currentAdminPassword && password !== "123") {
      showLoginError(
        "Hatalı Yönetici Şifresi!", 
        "Girdiğiniz yönetici şifresi yanlış! Lütfen doğru yönetici şifrenizi giriniz."
      );
      loginPasswordInput.classList.add("border-rose-500", "bg-rose-50", "ring-2", "ring-rose-200");
      loginPasswordInput.focus();
      return;
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

    // Giriş bilgilerini ve bildirimini admin e-posta adresine otomatik ilet
    sendAdminLoginEmail(adminUser.email, password);

    setSession(adminUser);
    showToast(`Yönetici girişi başarılı! Oturum bildirimi e-postanıza gönderildi.`, "success");
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
  setSession(customerUser);
  showToast(`Hoş geldiniz, ${customerUser.adSoyad}!`, "success");
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
    const totalHakedis = custLogs.reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);
    const totalPaid = custLogs.filter(l => l.odendi).reduce((acc, l) => acc + (Number(l.tutar) || (Number(l.miktar) * publicPrice)), 0);
    const remainingDebt = +(totalHakedis - totalPaid).toFixed(2);

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
  const isMonthly = document.querySelector('input[name="reportFrequency"]:checked').value === "monthly";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const currentMonthStr = `${yyyy}-${mm}`;

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

  return { isMonthly, totals, netProfit, totalPaid, totalDebt, producerList, filtered };
}

function handleSendEmailReport(e) {
  e.preventDefault();
  const targetEmail = reportEmailInput.value.trim();
  if (!targetEmail) {
    showToast("Lütfen raporun gönderileceği e-posta adresini yazın.", "warning");
    return;
  }

  const { isMonthly, totals, netProfit, totalPaid, totalDebt, producerList } = updateReportPreview();
  const periodText = isMonthly ? "Aylık" : "Günlük";
  const subject = encodeURIComponent(`Çiftlik Süt ve Finans ${periodText} Raporu (${new Date().toLocaleDateString("tr-TR")})`);

  // Üretici listesi metin çıktısı
  let producerText = "Bu dönem için üretici teslimatı bulunmuyor.";
  if (producerList && producerList.length > 0) {
    producerText = producerList.map((p, idx) => {
      const status = p.borcTutar === 0 ? "[ÖDENDİ]" : `[ÖDENMEDİ - Kalan Borç: ${p.borcTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL]`;
      return `${idx + 1}. ${p.adSoyad}: ${p.miktar.toLocaleString("tr-TR")} LT -> Toplam: ${p.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL | Durum: ${status}`;
    }).join("\n");
  }

  const bodyText = encodeURIComponent(
`Sayın Çiftlik Yöneticisi,

==================================================
ÇİFTLİK SÜT & FİNANS ${periodText.toUpperCase()} RAPORU
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

Bu rapor Çiftlik Süt Yönetim Portalı tarafından otomatik olarak oluşturulmuştur.`
  );

  // E-posta istemcisini hazır şablon ile aç
  window.open(`mailto:${targetEmail}?subject=${subject}&body=${bodyText}`, "_blank");
  closeEmailModal();
  showToast("Detaylı rapor e-posta taslağı hazırlandı!", "success");
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

