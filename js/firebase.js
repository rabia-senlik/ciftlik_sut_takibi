// ============================================================================
// FIREBASE / FIRESTORE SERVİSİ
// ============================================================================
// Firebase v10 modüler SDK'sı CDN üzerinden yüklenir.
// Böylece npm, node veya bundler olmadan doğrudan tarayıcıda çalışır.
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

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let db = null;
let isConfigured = false;

try {
  if (isFirebaseConfigured()) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isConfigured = true;
    console.log("✅ Firebase Firestore başarıyla bağlandı!");
  } else {
    console.warn("⚠️ Firebase yapılandırması henüz girilmedi. Yerel (LocalStorage) demo modu devrede.");
  }
} catch (error) {
  console.error("Firebase başlatılırken hata oluştu:", error);
}

const COLLECTION_NAME = "sut_kayitlari";
const LOCAL_STORAGE_KEY = "ciftlik_sut_kayitlari_demo";

/**
 * Kayıtları gerçek zamanlı dinler (Real-time listener).
 * Firebase yapılandırılmışsa onSnapshot kullanır.
 * Yapılandırılmamışsa LocalStorage kullanarak test imkanı sağlar.
 */
export function subscribeToMilkRecords(onUpdate, onError) {
  if (isConfigured && db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("tarih", "desc")
      );

      // Firestore onSnapshot: Her veri değişiminde anında tetiklenir
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const records = [];
        snapshot.forEach((docSnap) => {
          records.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        onUpdate(records, true); // true: Gerçek Firebase bağlantısı
      }, (err) => {
        console.error("Firestore dinleme hatası:", err);
        if (onError) onError(err);
      });

      return unsubscribe;
    } catch (err) {
      console.error("Firestore sorgu başlatma hatası:", err);
      if (onError) onError(err);
    }
  }

  // Fallback / Demo modu (LocalStorage)
  const loadLocalRecords = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const records = raw ? JSON.parse(raw) : getInitialDemoData();
      // Tarihe göre yeniden eskiye sırala
      records.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
      onUpdate(records, false); // false: Yerel mod
    } catch (e) {
      console.error("Yerel kayıtlar yüklenemedi:", e);
    }
  };

  loadLocalRecords();
  window.addEventListener("ciftlik_local_update", loadLocalRecords);

  return () => {
    window.removeEventListener("ciftlik_local_update", loadLocalRecords);
  };
}

/**
 * Yeni süt kaydı ekler.
 */
export async function addMilkRecord(recordData) {
  // Sayısal değerleri doğrula ve dönüştür
  const musteriler = Array.isArray(recordData.halkMusteriler) ? recordData.halkMusteriler : [];
  const halkToplam = musteriler.length > 0 
    ? +(musteriler.reduce((acc, m) => acc + (Number(m.miktar) || 0), 0)).toFixed(2)
    : Number(recordData.halkSut || 0);

  const payload = {
    tarih: recordData.tarih,
    toplamUretim: Number(recordData.toplamUretim),
    fabrikaSut: Number(recordData.fabrikaSut || 0),
    halkSut: halkToplam,
    halkMusteriler: musteriler,
    kalanSut: Number((Number(recordData.toplamUretim) - (Number(recordData.fabrikaSut || 0) + halkToplam)).toFixed(2)),
    not: recordData.not || "",
    eklenmeTarihi: new Date().toISOString()
  };

  if (isConfigured && db) {
    // Firestore'a kayıt ekle
    const colRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(colRef, {
      ...payload,
      olusturulduAt: serverTimestamp()
    });
    return docRef.id;
  } else {
    // Demo modunda LocalStorage'a ekle
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : getInitialDemoData();
    const newRecord = {
      id: "demo_" + Date.now(),
      ...payload
    };
    list.unshift(newRecord);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("ciftlik_local_update"));
    return newRecord.id;
  }
}

/**
 * Bir kaydı siler.
 */
export async function deleteMilkRecord(id) {
  if (isConfigured && db) {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } else {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : getInitialDemoData();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("ciftlik_local_update"));
  }
}

/**
 * Kullanıcı Firebase girmeden önce sayfayı ilk açtığında göreceği örnek veriler
 */
function getInitialDemoData() {
  const today = new Date();
  const d1 = new Date(today);
  const d2 = new Date(today);
  d2.setDate(today.getDate() - 1);
  const d3 = new Date(today);
  d3.setDate(today.getDate() - 2);

  const formatDate = (d) => d.toISOString().split("T")[0];

  const defaultData = [
    {
      id: "demo_1",
      tarih: formatDate(d1),
      toplamUretim: 850,
      fabrikaSut: 700,
      halkSut: 120,
      halkMusteriler: [
        { adSoyad: "Ahmet Yılmaz", miktar: 50 },
        { adSoyad: "Fatma Demir", miktar: 40 },
        { adSoyad: "Mehmet Çelik", miktar: 30 }
      ],
      kalanSut: 30,
      not: "Sabah ve akşam sağımı sorunsuz",
      eklenmeTarihi: new Date().toISOString()
    },
    {
      id: "demo_2",
      tarih: formatDate(d2),
      toplamUretim: 820,
      fabrikaSut: 680,
      halkSut: 110,
      halkMusteriler: [
        { adSoyad: "Mustafa Kaya", miktar: 60 },
        { adSoyad: "Zeynep Şahin", miktar: 50 }
      ],
      kalanSut: 30,
      not: "Tank bakımı yapıldı",
      eklenmeTarihi: new Date().toISOString()
    },
    {
      id: "demo_3",
      tarih: formatDate(d3),
      toplamUretim: 790,
      fabrikaSut: 650,
      halkSut: 130,
      halkMusteriler: [
        { adSoyad: "Hasan Yıldız", miktar: 70 },
        { adSoyad: "Emine Koç", miktar: 60 }
      ],
      kalanSut: 10,
      not: "Halk satışı yoğun geçti",
      eklenmeTarihi: new Date().toISOString()
    }
  ];

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
}

export function checkFirebaseStatus() {
  return isConfigured;
}
