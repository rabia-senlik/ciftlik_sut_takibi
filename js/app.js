// ============================================================================
// UYGULAMA ANA MANTIĞI (APP.JS) - KİŞİ BAZLI YEREL HALK SATIŞI DESTEKLİ
// ============================================================================

import { 
  subscribeToMilkRecords, 
  addMilkRecord, 
  deleteMilkRecord, 
  checkFirebaseStatus 
} from "./firebase.js";
import { showToast } from "./toast.js";

// Global Durum (State)
let allRecords = [];
let recordToDeleteId = null;
let currentCustomers = []; // Formda o gün için eklenen kişi listesi [{ id, adSoyad, miktar }]

// DOM Elementleri
const form = document.getElementById("milk-record-form");
const inputTarih = document.getElementById("input-tarih");
const inputToplam = document.getElementById("input-toplam");
const inputFabrika = document.getElementById("input-fabrika");
const inputNot = document.getElementById("input-not");
const submitBtn = document.getElementById("submit-btn");
const submitSpinner = document.getElementById("submit-spinner");
const submitBtnText = document.getElementById("submit-btn-text");
const resetBtn = document.getElementById("reset-btn");
const searchInput = document.getElementById("search-input");

// Kişi Bazlı Satış Elementleri
const customerNameInput = document.getElementById("customer-name");
const customerAmountInput = document.getElementById("customer-amount");
const addCustomerBtn = document.getElementById("add-customer-btn");
const customerListBox = document.getElementById("customer-list-box");
const customerEmptyText = document.getElementById("customer-empty-text");
const badgeHalkToplam = document.getElementById("badge-halk-toplam");

// Canlı Hesaplama Elementleri
const liveDagitilan = document.getElementById("live-dagitilan");
const liveKalan = document.getElementById("live-kalan");
const liveProgressBar = document.getElementById("live-progress-bar");
const liveErrorMsg = document.getElementById("live-error-msg");
const liveCalcBox = document.getElementById("live-calc-box");

// Tablo & İstatistik Elementleri
const tableBody = document.getElementById("records-table-body");
const emptyState = document.getElementById("empty-state");
const statToplam = document.getElementById("stat-toplam");
const statFabrika = document.getElementById("stat-fabrika");
const statFabrikaOran = document.getElementById("stat-fabrika-oran");
const statHalk = document.getElementById("stat-halk");
const statHalkOran = document.getElementById("stat-halk-oran");
const statKalan = document.getElementById("stat-kalan");
const statKayitSayisi = document.getElementById("stat-kayit-sayisi");

// Silme Modalı Elementleri
const deleteModal = document.getElementById("delete-modal");
const deleteModalDesc = document.getElementById("delete-modal-desc");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

// Kişi Detay Modalı Elementleri
const customerDetailModal = document.getElementById("customer-detail-modal");
const customerModalSubtitle = document.getElementById("customer-modal-subtitle");
const customerModalList = document.getElementById("customer-modal-list");
const customerModalTotal = document.getElementById("customer-modal-total");
const closeCustomerModalBtn = document.getElementById("close-customer-modal-btn");

// Durum Rozeti & Banner
const connectionBadge = document.getElementById("connection-badge");
const connectionText = document.getElementById("connection-text");
const guideBanner = document.getElementById("firebase-guide-banner");
const closeBannerBtn = document.getElementById("close-banner-btn");

// ============================================================================
// BAŞLANGIÇ (INIT)
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  initDefaultDate();
  updateClock();
  setInterval(updateClock, 60000);
  setupEventListeners();
  initRecordsSubscription();
});

/**
 * Tarih alanını otomatik olarak bugünün yerel tarihiyle doldurur.
 */
function initDefaultDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  inputTarih.value = `${year}-${month}-${day}`;
}

/**
 * Navbar'daki güncel saat ve tarihi gösterir.
 */
function updateClock() {
  const clockEl = document.getElementById("current-datetime");
  if (!clockEl) return;
  const now = new Date();
  const options = { day: "numeric", month: "long", weekday: "short" };
  clockEl.textContent = now.toLocaleDateString("tr-TR", options);
}

// ============================================================================
// ETKİNLİK DİNLEYİCİLERİ (EVENT LISTENERS)
// ============================================================================

function setupEventListeners() {
  // Üretim ve fabrika girdileri değiştikçe canlı hesapla
  [inputToplam, inputFabrika].forEach(input => {
    input.addEventListener("input", handleLiveCalculation);
  });

  // Kişi Ekleme Butonu
  if (addCustomerBtn) {
    addCustomerBtn.addEventListener("click", handleAddCustomer);
  }

  // Kişi kutularında Enter'a basınca ekleme
  [customerNameInput, customerAmountInput].forEach(inp => {
    if (inp) {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddCustomer();
        }
      });
    }
  });

  // Form gönderme (Kayıt ekleme)
  form.addEventListener("submit", handleFormSubmit);

  // Form temizleme
  resetBtn.addEventListener("click", () => {
    form.reset();
    currentCustomers = [];
    renderCustomerList();
    initDefaultDate();
    handleLiveCalculation();
  });

  // Tablo arama filtresi
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    renderFilteredRecords(term);
  });

  // Silme modalı kontrolleri
  cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  confirmDeleteBtn.addEventListener("click", executeRecordDelete);

  // Kişi detay modalı kapatma
  if (closeCustomerModalBtn) {
    closeCustomerModalBtn.addEventListener("click", closeCustomerModal);
  }
  if (customerDetailModal) {
    customerDetailModal.addEventListener("click", (e) => {
      if (e.target === customerDetailModal) closeCustomerModal();
    });
  }

  // Banner kapatma butonu
  if (closeBannerBtn && guideBanner) {
    closeBannerBtn.addEventListener("click", () => {
      guideBanner.classList.add("hidden");
    });
  }
}

// ============================================================================
// KİŞİ BAZLI YEREL HALK SATIŞ YÖNETİMİ
// ============================================================================

/**
 * Formda listeye yeni bir kişi ve süt miktarı ekler.
 */
function handleAddCustomer() {
  const name = customerNameInput.value.trim();
  const amount = parseFloat(customerAmountInput.value);

  if (!name) {
    showToast("Lütfen süt verilen kişinin Ad ve Soyadını yazın.", "warning");
    customerNameInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast("Lütfen 0'dan büyük geçerli bir süt miktarı (Litre) girin.", "warning");
    customerAmountInput.focus();
    return;
  }

  // Listeye ekle
  currentCustomers.push({
    id: "cust_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    adSoyad: name,
    miktar: amount
  });

  // Giriş kutularını temizle
  customerNameInput.value = "";
  customerAmountInput.value = "";
  customerNameInput.focus();

  // Listeyi güncelle ve toplamları yeniden hesapla
  renderCustomerList();
  handleLiveCalculation();
}

/**
 * Eklenen bir kişiyi listeden kaldırır.
 */
function handleRemoveCustomer(id) {
  currentCustomers = currentCustomers.filter(c => c.id !== id);
  renderCustomerList();
  handleLiveCalculation();
}

/**
 * Formdaki kişi listesini ekrana basar ve toplam halk sütünü günceller.
 */
function renderCustomerList() {
  if (!customerListBox) return;

  const totalHalkSut = currentCustomers.reduce((acc, c) => acc + (Number(c.miktar) || 0), 0);

  if (currentCustomers.length === 0) {
    customerListBox.innerHTML = `
      <div id="customer-empty-text" class="text-center py-3 text-xs text-indigo-400 italic bg-white/50 rounded-xl border border-dashed border-indigo-200">
        Henüz kişi eklenmedi
      </div>
    `;
    badgeHalkToplam.textContent = "Toplam: 0 LT";
    return;
  }

  badgeHalkToplam.textContent = `Toplam: ${totalHalkSut.toLocaleString("tr-TR")} LT (${currentCustomers.length} Kişi)`;

  customerListBox.innerHTML = "";
  currentCustomers.forEach((cust) => {
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
          ${Number(cust.miktar).toLocaleString("tr-TR")} LT
        </span>
        <button 
          type="button" 
          data-id="${cust.id}" 
          class="remove-cust-btn text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
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

  // Kişi silme butonlarını bağla
  customerListBox.querySelectorAll(".remove-cust-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleRemoveCustomer(btn.dataset.id);
    });
  });
}

// ============================================================================
// İŞ MANTIĞI VE CANLI HESAPLAMA (BUSINESS LOGIC)
// ============================================================================

/**
 * Kullanıcı sayıları girerken veya kişi ekleyip çıkarırken canlı hesaplar.
 */
function handleLiveCalculation() {
  const toplam = parseFloat(inputToplam.value) || 0;
  const fabrika = parseFloat(inputFabrika.value) || 0;
  const halk = currentCustomers.reduce((acc, c) => acc + (Number(c.miktar) || 0), 0);
  
  const dagitilan = +(fabrika + halk).toFixed(2);
  const kalan = +(toplam - dagitilan).toFixed(2);

  liveDagitilan.textContent = `${dagitilan.toLocaleString("tr-TR")} LT`;
  liveKalan.textContent = `${kalan.toLocaleString("tr-TR")} LT`;

  // Aşım Kontrolü (İş Kuralı: Fabrika + Halk > Toplam Olamaz)
  const isExceeded = toplam > 0 && dagitilan > toplam;

  if (isExceeded) {
    // Hatalı / Aşım durumu
    liveCalcBox.className = "p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs transition-colors";
    liveKalan.className = "font-bold text-rose-600";
    liveErrorMsg.classList.remove("hidden");
    liveProgressBar.className = "bg-rose-500 h-1.5 rounded-full transition-all duration-300";
    liveProgressBar.style.width = "100%";
    submitBtn.classList.add("opacity-60", "cursor-not-allowed");
  } else {
    // Normal durum
    liveCalcBox.className = "p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs transition-colors";
    liveKalan.className = kalan === 0 ? "font-bold text-slate-700" : "font-bold text-emerald-600";
    liveErrorMsg.classList.add("hidden");
    liveProgressBar.className = "bg-emerald-500 h-1.5 rounded-full transition-all duration-300";
    
    const percentage = toplam > 0 ? Math.min(100, (dagitilan / toplam) * 100) : 0;
    liveProgressBar.style.width = `${percentage}%`;
    submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
  }

  return { toplam, fabrika, halk, dagitilan, kalan, isExceeded };
}

/**
 * Form gönderildiğinde veriyi doğrular ve Firestore'a yazar.
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const { toplam, fabrika, halk, dagitilan, isExceeded } = handleLiveCalculation();

  // Zorunlu alan kontrolü
  if (!inputTarih.value) {
    showToast("Lütfen geçerli bir tarih seçin.", "warning");
    inputTarih.focus();
    return;
  }

  if (toplam <= 0) {
    showToast("Lütfen 0'dan büyük bir toplam üretim miktarı girin.", "warning");
    inputToplam.focus();
    return;
  }

  // İş Mantığı Kuralı: Verilen toplam süt, üretilen sütü geçemez!
  if (isExceeded) {
    showToast(
      `Hata: Fabrikaya (${fabrika} L) ve halka (${halk} L) verilen toplam süt miktarı (${dagitilan} L), üretilen toplam süt miktarını (${toplam} L) geçemez!`,
      "error",
      5000
    );
    return;
  }

  // Butonu yükleniyor durumuna al
  setSubmittingState(true);

  try {
    const newRecord = {
      tarih: inputTarih.value,
      toplamUretim: toplam,
      fabrikaSut: fabrika,
      halkSut: halk,
      halkMusteriler: [...currentCustomers],
      not: inputNot.value.trim()
    };

    await addMilkRecord(newRecord);

    showToast("Süt kaydı başarıyla eklendi!", "success");
    
    // Formu temizle ve bugünün tarihini geri koy
    form.reset();
    currentCustomers = [];
    renderCustomerList();
    initDefaultDate();
    handleLiveCalculation();

  } catch (error) {
    console.error("Kayıt ekleme hatası:", error);
    showToast("Kayıt eklenirken bir hata oluştu: " + error.message, "error");
  } finally {
    setSubmittingState(false);
  }
}

function setSubmittingState(isLoading) {
  submitBtn.disabled = isLoading;
  if (isLoading) {
    submitSpinner.classList.remove("hidden");
    submitBtnText.textContent = "Kaydediliyor...";
  } else {
    submitSpinner.classList.add("hidden");
    submitBtnText.textContent = "Kaydı Sisteme Kaydet";
  }
}

// ============================================================================
// VERİ ABONELİĞİ VE TABLO YÖNETİMİ
// ============================================================================

function initRecordsSubscription() {
  subscribeToMilkRecords(
    (records, isRealFirebase) => {
      allRecords = records;
      updateConnectionStatus(isRealFirebase);
      updateDashboardStats(records);
      renderTable(records);
    },
    (err) => {
      showToast("Veriler alınırken hata oluştu: " + err.message, "error");
    }
  );
}

/**
 * Bağlantı durum rozetini günceller.
 */
function updateConnectionStatus(isRealFirebase) {
  if (isRealFirebase) {
    connectionBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
    connectionBadge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>Firebase Senkronize</span>
    `;
    if (guideBanner) guideBanner.classList.add("hidden");
  } else {
    connectionBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200";
    connectionBadge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-amber-500"></span>
      <span>Demo / Yerel Mod</span>
    `;
    if (guideBanner) guideBanner.classList.remove("hidden");
  }
}

/**
 * Özet Bilgi Kartlarını (Dashboard Cards) Günceller
 */
function updateDashboardStats(records) {
  const totals = records.reduce(
    (acc, item) => {
      acc.toplam += Number(item.toplamUretim) || 0;
      acc.fabrika += Number(item.fabrikaSut) || 0;
      acc.halk += Number(item.halkSut) || 0;
      acc.kalan += Number(item.kalanSut) || 0;
      return acc;
    },
    { toplam: 0, fabrika: 0, halk: 0, kalan: 0 }
  );

  statToplam.textContent = totals.toplam.toLocaleString("tr-TR");
  statFabrika.textContent = totals.fabrika.toLocaleString("tr-TR");
  statHalk.textContent = totals.halk.toLocaleString("tr-TR");
  statKalan.textContent = totals.kalan.toLocaleString("tr-TR");
  statKayitSayisi.textContent = `${records.length} günün kaydı`;

  // Yüzde oranları
  if (totals.toplam > 0) {
    const fabrikaYuzde = ((totals.fabrika / totals.toplam) * 100).toFixed(1);
    const halkYuzde = ((totals.halk / totals.toplam) * 100).toFixed(1);
    statFabrikaOran.textContent = `%${fabrikaYuzde} pay`;
    statHalkOran.textContent = `%${halkYuzde} pay`;
  } else {
    statFabrikaOran.textContent = "%0 pay";
    statHalkOran.textContent = "%0 pay";
  }
}

/**
 * Kayıt tablosunu ekrana basar.
 */
function renderTable(records) {
  tableBody.innerHTML = "";

  if (!records || records.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  records.forEach((record) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50/80 transition-colors group";

    // Tarihi daha okunaklı biçime dönüştür (Örn: 21 Eki 2026)
    let formattedDate = record.tarih;
    try {
      const parts = record.tarih.split("-");
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        formattedDate = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) {
      formattedDate = record.tarih;
    }

    const musteriler = record.halkMusteriler || [];
    const musteriSayisi = musteriler.length;

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <span>${formattedDate}</span>
          ${record.not ? `<span class="inline-block w-2 h-2 rounded-full bg-blue-400" title="${escapeHtml(record.not)}"></span>` : ""}
        </div>
      </td>
      <td class="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
        ${Number(record.toplamUretim).toLocaleString("tr-TR")} <span class="text-xs font-normal text-slate-400">LT</span>
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
          data-date="${formattedDate}" 
          class="delete-record-btn text-slate-300 hover:text-rose-600 transition p-1 rounded-lg hover:bg-rose-50" 
          title="Kaydı Sil"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  // Silme butonlarını bağla
  document.querySelectorAll(".delete-record-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openDeleteModal(btn.dataset.id, btn.dataset.date);
    });
  });

  // Kişi detay butonlarını bağla
  document.querySelectorAll(".view-customers-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const record = records.find(r => r.id === btn.dataset.id);
      if (record) openCustomerModal(record);
    });
  });
}

/**
 * Arama terimine göre filtreler.
 */
function renderFilteredRecords(term) {
  if (!term) {
    renderTable(allRecords);
    return;
  }

  const filtered = allRecords.filter((rec) => {
    const dateMatch = rec.tarih && rec.tarih.includes(term);
    const noteMatch = rec.not && rec.not.toLowerCase().includes(term);
    const customerMatch = (rec.halkMusteriler || []).some(m => 
      m.adSoyad && m.adSoyad.toLowerCase().includes(term)
    );
    return dateMatch || noteMatch || customerMatch;
  });

  renderTable(filtered);
}

// ============================================================================
// KİŞİ DETAY MODAL YÖNETİMİ
// ============================================================================

function openCustomerModal(record) {
  if (!customerDetailModal) return;

  let formattedDate = record.tarih;
  try {
    const parts = record.tarih.split("-");
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      formattedDate = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    }
  } catch (e) {
    formattedDate = record.tarih;
  }

  customerModalSubtitle.textContent = `${formattedDate} Tarihli Satış Dökümü`;
  customerModalTotal.textContent = `${Number(record.halkSut || 0).toLocaleString("tr-TR")} LT (${(record.halkMusteriler || []).length} Kişi)`;

  customerModalList.innerHTML = "";
  const musteriler = record.halkMusteriler || [];

  if (musteriler.length === 0) {
    customerModalList.innerHTML = `
      <div class="text-center py-6 text-xs text-slate-400">
        Bu kayıt için detaylı kişi kaydı bulunmuyor.
      </div>
    `;
  } else {
    musteriler.forEach((m) => {
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
          ${Number(m.miktar).toLocaleString("tr-TR")} LT
        </span>
      `;
      customerModalList.appendChild(div);
    });
  }

  customerDetailModal.classList.remove("hidden");
}

function closeCustomerModal() {
  if (customerDetailModal) {
    customerDetailModal.classList.add("hidden");
  }
}

// ============================================================================
// SİLME MODAL YÖNETİMİ
// ============================================================================

function openDeleteModal(id, dateText) {
  recordToDeleteId = id;
  deleteModalDesc.textContent = `${dateText} tarihli süt kaydını kalıcı olarak silmek istediğinizden emin misiniz?`;
  deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  recordToDeleteId = null;
  deleteModal.classList.add("hidden");
}

async function executeRecordDelete() {
  if (!recordToDeleteId) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Siliniyor...";

  try {
    await deleteMilkRecord(recordToDeleteId);
    showToast("Kayıt başarıyla silindi.", "info");
    closeDeleteModal();
  } catch (err) {
    console.error("Kayıt silme hatası:", err);
    showToast("Kayıt silinirken hata oluştu: " + err.message, "error");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Evet, Sil";
  }
}

// Yardımcı XSS koruması
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
