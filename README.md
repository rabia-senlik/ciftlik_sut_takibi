# 🐄 Çiftlik Süt Üretim ve Satış Takip Sistemi

Çiftlikteki ineklerden elde edilen günlük süt üretimini, fabrikaya verilen miktarı ve yerel halka yapılan satışı anlık olarak takip eden, sunucusuz (serverless) mimaride modern bir web uygulaması.

---

## 📁 1. Proje Klasör Yapısı

```text
çiftlik/
│
├── index.html              # Ana responsive tek sayfalık web arayüzü (Tailwind CSS)
│
├── css/
│   └── style.css           # Özel yazı tipleri, animasyonlar ve şık scrollbar
│
├── js/
│   ├── firebase-config.js  # Firebase API ve Proje Anahtarlarının girileceği dosya
│   ├── firebase.js         # Firestore bağlantısı, onSnapshot (anlık dinleyici) ve CRUD metodları
│   ├── toast.js            # Şık Toast / Alert bildirim sistemi
│   └── app.js              # Canlı veri doğrulama, iş mantığı, dashboard hesaplamaları
│
└── README.md               # Kurulum ve kullanım rehberi
```

---

## 🚀 2. Nasıl Çalıştırılır? (Terminal Komutları)

Uygulama, modern **ES Modules** ve **Firebase v10 CDN** mimarisinde geliştirildiği için ek bir derleme (build) aracına veya karmaşık kuruluma ihtiyaç duymaz.

### Seçenek A: Python ile Yerel Sunucu Başlatma (Tavsiye Edilen)
Bilgisayarınızda Python yüklü olduğu için terminalde (PowerShell) proje klasöründeyken şu komutu çalıştırmanız yeterlidir:

```powershell
python -m http.server 3000
```
Ardından tarayıcınızdan `http://localhost:3000` adresine girin.

### Seçenek B: VS Code Live Server Eklentisi
Eğer Visual Studio Code kullanıyorsanız, `index.html` dosyasına sağ tıklayıp **"Open with Live Server"** seçeneğini seçebilirsiniz.

*(Not: Firebase anahtarlarınızı girmeden önce sayfayı açarsanız, uygulama otomatik olarak **Demo / Yerel Mod**da başlar ve tüm fonksiyonları (kayıt ekleme, canlı hesaplama, silme, özet kartları) hemen test edebilirsiniz).*

---

## 🔥 3. Firebase Firestore Kurulumu ve Bağlantısı

Verilerin farklı telefonlardan, tabletlerden ve bilgisayarlardan anında senkronize olabilmesi için Firebase Firestore kurulumunu şu adımlarla tamamlayabilirsiniz:

### Adım 1: Firebase Projesi Oluşturun
1. [Firebase Console](https://console.firebase.google.com/) adresine gidin ve Google hesabınızla giriş yapın.
2. **"Proje Ekle" (Add Project)** butonuna tıklayın.
3. Projenize bir isim verin (Örn: `Ciftlik-Sut-Takip`) ve adımları onaylayarak projeyi oluşturun.

### Adım 2: Cloud Firestore Veritabanını Başlatın
1. Sol menüden **"Oluştur" (Build) > "Firestore Database"** bölümüne girin.
2. **"Veritabanı Oluştur" (Create Database)** butonuna basın.
3. Konum olarak `eur3 (europe-west)` veya size yakın bir bölge seçin.
4. Güvenlik kuralları adımında **"Test modunda başlat" (Start in test mode)** seçeneğini işaretleyip **Oluştur**'a tıklayın.
   *(Test modu 30 gün boyunca herhangi bir kimlik doğrulama gerektirmeden kayıt ekleyip okumanızı sağlar).*

### Adım 3: Web Uygulamasını Ekleyin ve API Anahtarlarını Alın
1. Firebase ana sayfasında (Project Overview), projenizin altındaki **Web simgesine (`</>`)** tıklayın.
2. Uygulama takma adı girin (Örn: `Ciftlik Web`) ve **"Uygulamayı kaydet"** deyin.
3. Karşınıza aşağıdaki gibi bir `firebaseConfig` nesnesi gelecektir:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "ciftlik-takip.firebaseapp.com",
  projectId: "ciftlik-takip",
  storageBucket: "ciftlik-takip.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Adım 4: Anahtarları Projeye Yapıştırın
Projenizdeki [`js/firebase-config.js`](file:///c:/Users/rabia.senlik/Desktop/çiftlik/js/firebase-config.js) dosyasını açın ve içindeki değerleri kendi aldığınız bilgilerle değiştirin:

```javascript
export const firebaseConfig = {
  apiKey: "SİZİN_API_KEY_DEĞERİNİZ",
  authDomain: "PROJE_ID.firebaseapp.com",
  projectId: "PROJE_ID",
  storageBucket: "PROJE_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
```

Dosyayı kaydettiğiniz anda üstteki durum rozeti yeşil renkte **"Firebase Senkronize"** olarak güncellenecek ve tüm cihazlar arasında gerçek zamanlı veri akışı başlayacaktır.

---

## ⚙️ 4. İş Mantığı ve Kurallar

1. **Kişi Bazlı Yerel Halk Satışı:**
   - Tek bir toplu rakam yerine, süt alan kişilerin **Ad Soyad** ve **Litre** bilgileri tek tek listeye eklenebilir.
   - Sistem girilen kişilerin sütlerini otomatik olarak toplayıp "Halka Verilen Toplam" miktarı hesaplar.
   - Geçmiş kayıtlar tablosunda kaç kişiye süt verildiği bir buton olarak görünür; tıklandığında kimin kaç litre süt aldığını gösteren detaylı bir modal pencere açılır.
2. **Aşım Kontrolü (Fabrika + Halk <= Toplam Üretim):**
   - Kullanıcı formdaki kutulara sayıları yazarken veya kişi eklerken, formun altındaki canlı gösterge anında kalan süt miktarını ve dağıtılan payı hesaplar.
   - Eğer fabrikaya ve halka verilen sütlerin toplamı, üretilen sütü aşarsa:
     - Form kutusu ve çubuk otomatik kırmızıya döner.
     - Kaydet butonu devre dışı bırakılır.
     - Kaydetmeye basılırsa kullanıcıya şık bir hata uyarısı (Toast) gösterilir ve işlem engellenir.
3. **Gerçek Zamanlı (Real-Time) Dinleme:**
   - Firestore'un `onSnapshot` özelliği sayesinde bir telefondan veri girildiğinde veya silindiğinde, açık olan diğer tüm telefon veya bilgisayarlarda sayfa yenilenmeden veriler ve özet bilgi kartları anında güncellenir.
4. **Mobil Uyum (Responsive):**
   - Telefon ekranlarında rahatça tek elle kullanılabilir form yapısı ve yatay kaydırılabilir dokunmatik tablo tasarımı entegre edilmiştir.
