// ============================================================================
// ÇİFTLİK SÜT TAKİP SİSTEMİ - APP.JS
// Kişi Bazlı Yerel Halk Satışı + Firestore Gerçek Zamanlı Senkronizasyon
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
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
const COLLECTION_NAME = "sut_kayitlari";

// ============================================================================
// 2. DOM ELEMENTLERİ VE DURUM (STATE)
// ============================================================================
let recordsList = [];
let recordToDeleteId = null;
let currentCustomers = []; // O gün eklenen kişiler: [{ id, adSoyad, miktar }]

// Form Elementleri
const milkForm = document.getElementById("milk-form");
const dateInput = document.getElementById("input-date");
const totalInput = document.getElementById("input-total");
const factoryInput = document.getElementById("input-factory");
const noteInput = document.getElementById("input-note");
const submitBtn = document.getElementById("submit-btn");
const submitText = document.getElementById("submit-text");
const submitSpinner = document.getElementById("submit-spinner");
const resetBtn = document.getElementById("reset-btn");

// Kişi Bazlı Satış Elementleri
const customerNameInput = document.getElementById("customer-name");
const customerAmountInput = document.getElementById("customer-amount");
const addCustomerBtn = document.getElementById("add-customer-btn");
const customerListBox = document.getElementById("customer-list-box");
const badgeHalkToplam = document.getElementById("badge-halk-toplam");

// Canlı Hesaplama & Uyarı Elementleri
const liveDistributed = document.getElementById("live-distributed");
const liveRemaining = document.getElementById("live-remaining");
const liveBar = document.getElementById("live-bar");
const liveAlert = document.getElementById("live-alert");
const liveBox = document.getElementById("live-box");

// İstatistik Kartları Elementleri
const statTotal = document.getElementById("stat-total");
const statFactory = document.getElementById("stat-factory");
const statFactoryRatio = document.getElementById("stat-factory-ratio");
const statPublic = document.getElementById("stat-public");
const statPublicRatio = document.getElementById("stat-public-ratio");
const statRemaining = document.getElementById("stat-remaining");
const statCount = document.getElementById("stat-count");

// Tablo & Arama Elementleri
const recordsTableBody = document.getElementById("records-table-body");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");

// Silme Modalı Elementleri
const deleteModal = document.getElementById("delete-modal");
const deleteModalText = document.getElementById("delete-modal-text");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

// Kişi Detay Modalı Elementleri
const customerDetailModal = document.getElementById("customer-detail-modal");
const customerModalSubtitle = document.getElementById("customer-modal-subtitle");
const customerModalList = document.getElementById("customer-modal-list");
const customerModalTotal = document.getElementById("customer-modal-total");
const closeCustomerModalBtn = document.getElementById("close-customer-modal-btn");

// Toast Bildirim Konteyneri
const toastContainer = document.getElementById("toast-container");

// ============================================================================
// 3. BAŞLANGIÇ (INIT) VE ETKİNLİK DİNLEYİCİLERİ
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  setDefaultTodayDate();
  setupEventListeners();
  listenToFirestoreRecords();
});

function setDefaultTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function setupEventListeners() {
  // Canlı girdi değişimleri
  [totalInput, factoryInput].forEach(inp => {
    inp.addEventListener("input", handleLiveCalculation);
  });

  // Kişi Ekle Butonu
  if (addCustomerBtn) {
    addCustomerBtn.addEventListener("click", handleAddCustomer);
  }

  // Kişi kutularında Enter ile hızlı ekleme
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

  // Form Gönderme
  milkForm.addEventListener("submit", handleFormSubmit);

  // Form Sıfırlama
  resetBtn.addEventListener("click", () => {
    milkForm.reset();
    currentCustomers = [];
    renderCustomerList();
    setDefaultTodayDate();
    handleLiveCalculation();
  });

  // Arama / Filtreleme
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    filterRecords(term);
  });

  // Modalları Kapatma
  cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  confirmDeleteBtn.addEventListener("click", executeDelete);

  if (closeCustomerModalBtn) {
    closeCustomerModalBtn.addEventListener("click", closeCustomerModal);
  }
  if (customerDetailModal) {
    customerDetailModal.addEventListener("click", (e) => {
      if (e.target === customerDetailModal) closeCustomerModal();
    });
  }
}

// ============================================================================
// 4. KİŞİ BAZLI YEREL HALK SATIŞI YÖNETİMİ
// ============================================================================
function handleAddCustomer() {
  const name = customerNameInput.value.trim();
  const amount = parseFloat(customerAmountInput.value);

  if (!name) {
    showToast("Lütfen süt verilen kişinin Ad ve Soyadını yazın.", "warning");
    customerNameInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast("Lütfen geçerli bir litre miktarı girin.", "warning");
    customerAmountInput.focus();
    return;
  }

  currentCustomers.push({
    id: "c_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    adSoyad: name,
    miktar: amount
  });

  customerNameInput.value = "";
  customerAmountInput.value = "";
  customerNameInput.focus();

  renderCustomerList();
  handleLiveCalculation();
}

function handleRemoveCustomer(id) {
  currentCustomers = currentCustomers.filter(c => c.id !== id);
  renderCustomerList();
  handleLiveCalculation();
}

function renderCustomerList() {
  if (!customerListBox) return;

  const totalHalk = currentCustomers.reduce((acc, c) => acc + (Number(c.miktar) || 0), 0);

  if (currentCustomers.length === 0) {
    customerListBox.innerHTML = `
      <div id="customer-empty-text" class="text-center py-3 text-xs text-indigo-400 italic bg-white/50 rounded-xl border border-dashed border-indigo-200">
        Henüz kişi eklenmedi (İsteğe bağlı)
      </div>
    `;
    badgeHalkToplam.textContent = "Toplam: 0 LT";
    return;
  }

  badgeHalkToplam.textContent = `Toplam: ${totalHalk.toLocaleString("tr-TR")} LT (${currentCustomers.length} Kişi)`;

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

  customerListBox.querySelectorAll(".remove-cust-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleRemoveCustomer(btn.dataset.id);
    });
  });
}

// ============================================================================
// 5. İŞ MANTIĞI VE CANLI DOĞRULAMA (BUSINESS RULES)
// ============================================================================
function handleLiveCalculation() {
  const total = parseFloat(totalInput.value) || 0;
  const factory = parseFloat(factoryInput.value) || 0;
  const pub = currentCustomers.reduce((acc, c) => acc + (Number(c.miktar) || 0), 0);

  const distributed = +(factory + pub).toFixed(2);
  const remaining = +(total - distributed).toFixed(2);

  liveDistributed.textContent = `${distributed.toLocaleString("tr-TR")} LT`;
  liveRemaining.textContent = `${remaining.toLocaleString("tr-TR")} LT`;

  // Kural: Fabrika + Halk > Toplam Olamaz!
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

async function handleFormSubmit(e) {
  e.preventDefault();

  const { total, factory, pub, distributed, remaining, isExceeded } = handleLiveCalculation();

  if (!dateInput.value) {
    showToast("Lütfen bir tarih seçin.", "warning");
    dateInput.focus();
    return;
  }

  if (total <= 0) {
    showToast("Lütfen 0'dan büyük bir toplam üretim miktarı girin.", "warning");
    totalInput.focus();
    return;
  }

  if (isExceeded) {
    showToast(
      `Hata: Fabrikaya (${factory} L) ve halka (${pub} L) verilen toplam (${distributed} L), üretilen sütü (${total} L) geçemez!`,
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
      halkMusteriler: [...currentCustomers],
      kalanSut: remaining,
      not: noteInput.value.trim(),
      olusturulduAt: serverTimestamp()
    };

    await addDoc(collection(db, COLLECTION_NAME), newRecord);

    showToast("Süt kaydı başarıyla Firestore'a kaydedildi!", "success");

    milkForm.reset();
    currentCustomers = [];
    renderCustomerList();
    setDefaultTodayDate();
    handleLiveCalculation();

  } catch (error) {
    console.error("Firestore Kayıt Hatası:", error);
    showToast("Kayıt eklenirken hata: " + error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitSpinner.classList.add("hidden");
    submitText.textContent = "Kaydı Sisteme Kaydet";
  }
}

// ============================================================================
// 6. GERÇEK ZAMANLI FIRESTORE DİNLEYİCİSİ (onSnapshot)
// ============================================================================
function listenToFirestoreRecords() {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("tarih", "desc")
    );

    onSnapshot(q, (snapshot) => {
      recordsList = [];
      snapshot.forEach((docSnap) => {
        recordsList.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      updateDashboardCards(recordsList);
      renderTable(recordsList);

      const statusBadge = document.getElementById("status-badge");
      if (statusBadge) {
        statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firestore Bağlı</span>`;
      }
    }, (error) => {
      console.error("Firestore Dinleme Hatası:", error);
      showToast("Veritabanı bağlantı hatası: " + error.message, "error");
    });
  } catch (err) {
    console.error("Firestore Başlatma Hatası:", err);
  }
}

// ============================================================================
// 7. GÖSTERGE PANELİ KARTLARI (DASHBOARD STAT CARDS)
// ============================================================================
function updateDashboardCards(records) {
  const totals = records.reduce((acc, r) => {
    acc.total += Number(r.toplamUretim) || 0;
    acc.factory += Number(r.fabrikaSut) || 0;
    acc.pub += Number(r.halkSut) || 0;
    acc.remaining += Number(r.kalanSut) || 0;
    return acc;
  }, { total: 0, factory: 0, pub: 0, remaining: 0 });

  statTotal.textContent = totals.total.toLocaleString("tr-TR");
  statFactory.textContent = totals.factory.toLocaleString("tr-TR");
  statPublic.textContent = totals.pub.toLocaleString("tr-TR");
  statRemaining.textContent = totals.remaining.toLocaleString("tr-TR");
  statCount.textContent = `${records.length} günün kaydı`;

  if (totals.total > 0) {
    statFactoryRatio.textContent = `%${((totals.factory / totals.total) * 100).toFixed(1)} pay`;
    statPublicRatio.textContent = `%${((totals.pub / totals.total) * 100).toFixed(1)} pay`;
  } else {
    statFactoryRatio.textContent = "%0 pay";
    statPublicRatio.textContent = "%0 pay";
  }
}

// ============================================================================
// 8. TABLO YÖNETİMİ VE RENDER
// ============================================================================
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

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <span>${dateStr}</span>
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

  // Silme Butonları
  recordsTableBody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openDeleteModal(btn.dataset.id, btn.dataset.date);
    });
  });

  // Kişi Detay Butonları
  recordsTableBody.querySelectorAll(".view-customers-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const record = records.find(r => r.id === btn.dataset.id);
      if (record) openCustomerModal(record);
    });
  });
}

function filterRecords(term) {
  if (!term) {
    renderTable(recordsList);
    return;
  }
  const filtered = recordsList.filter(r => 
    (r.tarih && r.tarih.includes(term)) || 
    (r.not && r.not.toLowerCase().includes(term)) ||
    ((r.halkMusteriler || []).some(m => m.adSoyad && m.adSoyad.toLowerCase().includes(term)))
  );
  renderTable(filtered);
}

// ============================================================================
// 9. KİŞİ DETAY MODAL YÖNETİMİ
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

  customerModalSubtitle.textContent = `${dateStr} Tarihli Satış Dökümü`;
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
// 10. SİLME MODAL YÖNETİMİ
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
    await deleteDoc(doc(db, COLLECTION_NAME, recordToDeleteId));
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
// 11. TOAST BİLDİRİM FONKSİYONU
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
