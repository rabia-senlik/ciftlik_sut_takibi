# 🌾 Şenlik Çiftliği Süt Takip Sistemi
## 👑 Yönetici (Admin) Detaylı Kullanım Kılavuzu

**Canlı Sistem Adresi:** [https://senlikciftligi.vercel.app/](https://senlikciftligi.vercel.app/)  
**İşletme:** Şenlik Besi ve Üretim Çiftliği & Şarküteri (Tekirdağ / Kapaklı)

---

## 📌 İçindekiler
1. [Sisteme Giriş & Yeni Yönetici Kaydı](#1-sisteme-giriş--yeni-yönetici-kaydı)
2. [Bağımsız Çiftlik Mantığı (Multi-Tenant)](#2-bağımsız-çiftlik-mantığı-multi-tenant)
3. [Günlük Süt Girişi & Dashboard (🥛 Günlük Giriş)](#3-günlük-süt-girişi--dashboard--günlük-giriş)
4. [Aylık Çizelge & Hakediş Matrisi (📊 Aylık Çizelge)](#4-aylık-çizelge--hakediş-matrisi--aylık-çizelge)
5. [Müşteri & Üretici Yönetimi (👥 Müşteriler)](#5-müşteri--üretici-yönetimi--müşteriler)
6. [Hızlı Fiyat & Şifre Güncelleme](#6-hızlı-fiyat--şifre-güncelleme)
7. [Rapor İndirme (Excel, PDF & E-posta Raporu)](#7-rapor-indirme-excel-pdf--e-posta-raporu)
8. [Müşteriler / Köylüler Sistemi Nasıl Kullanır?](#8-müşteriler--köylüler-sistemi-nasıl-kullanır)
9. [Firebase Veritabanında Kayıtları İzleme](#9-firebase-veritabanında-kayıtları-izleme)

---

## 🔑 1. Sisteme Giriş & Yeni Yönetici Kaydı

### Yeni Yönetici Kaydı Oluşturma:
1. Sitenin sağ üst köşesindeki **`✨ Kayıt Ol`** butonuna tıklayın (veya giriş penceresinin altındaki *"Yeni Hesap Oluşturun"* bağlantısına tıklayın).
2. Açılan formda:
   * **Ad Soyad / Çiftlik İsmi:** Örn: `Rabia Şenlik` veya `Şenlik Çiftliği`
   * **Yönetici E-posta Adresi:** Örn: `admin@senlikciftligi.com`
   * **Şifre:** En az 4 karakterden oluşan güvenli bir şifre belirleyin.
   * **Şifre Tekrarı:** Şifrenizi doğrulayın.
3. **"✨ Yönetici Hesabını Oluştur & Giriş Yap"** butonuna basın.  
   *(Sistem sizi otomatik olarak kendi bağımsız çiftlik panelinize yönlendirir).*

### Mevcut Yönetici Girişi:
1. Sağ üstteki **`👑 Giriş Yap`** butonuna tıklayın.
2. Açılan pencerede **👑 Yönetici (Admin)** sekmesinin seçili olduğundan emin olun.
3. Kayıt olduğunuz e-posta adresinizi ve şifrenizi girin.
4. **"Yönetici Olarak Giriş Yap"** butonuna basarak panelinize erişin.

> ⚠️ **Önemli Kural:** Kayıtsız e-posta adresleriyle veya yanlış şifreyle giriş yapılamaz. Sistem sizi doğrudan *"Kayıtlı Yönetici Hesabı Bulunamadı"* uyarısıyla kayıt olmaya yönlendirir.

---

## 🏢 2. Bağımsız Çiftlik Mantığı (Multi-Tenant)

Sistem tam izolasyonlu çoklu-yönetici mimarisine sahiptir:
* Sisteme kayıt olan her bir yönetici e-postası, Firebase üzerinde **tamamen kendine ait bağımsız bir çiftlik veri tabanı** açar.
* Bir yöneticinin girdiği sütler, eklediği köylüler ve fiyatlar **asla** başka bir yöneticinin ekranında görünmez.
* Verileriniz tamamen izole ve güvenli bir şekilde saklanır.

---

## 🥛 3. Günlük Süt Girişi & Dashboard (🥛 Günlük Giriş)

Admin panelinde ilk karşınıza çıkan ekrandır. Günlük toplanan ve fabrikaya satılan sütler buradan işlenir:

### Adım Adım Günlük Kayıt Ekleme:
1. **Tarih Seçimi:** En üstteki **Gün**, **Ay** ve **Yıl** kutularından kayıt girmek istediğiniz tarihi seçin (varsayılan olarak bugünün tarihi gelir).
2. **Fabrika Satış Bilgisi:**
   * Fabrikaya gönderilen süt miktarını (Litre) girin.
   * Fabrika litre satış fiyatı otomatik olarak güncel fiyattan hesaplanır (örneğin 28.00 ₺). İsterseniz o güne özel değiştirebilirsiniz.
3. **Köylülerden / Üreticilerden Alınan Sütler:**
   * *"Süt Teslim Eden Üretici"* kutusundan üreticiyi seçin veya adını yazın.
   * Teslim ettiği süt litresini girin.
   * Otomatik olarak halk alış fiyatından (örneğin 23.00 ₺) hakediş tutarı hesaplanır.
   * Eğer parası o an elden verildiyse **"Ödendi"** kutucuğunu işaretleyin, verilmediyse borç olarak kalsın.
   * **"Üreticiyi Ekle"** butonuna basın. (Birden fazla üreticiyi tek tek ekleyebilirsiniz).
4. **Canlı Kâr & Kontrol:**
   * Ekranın sağ altındaki canlı kutuda o günkü **Fabrika Geliri**, **Halka Ödenecek Tutar** ve **Net Kârınız** anlık olarak hesaplanır.
5. **Kaydet:** **"💾 Günlük Süt Kaydını Sisteme İşle"** butonuna basarak günü kapatın.
   * Alt kısımdaki **"Geçmiş Günlük Kayıtlar"** tablosunda tüm günler listelenir; silme veya detay inceleme yapılabilir.

---

## 📊 4. Aylık Çizelge & Hakediş Matrisi (📊 Aylık Çizelge)

Bu bölüm, süt toplama defterinizin / Excel tablonuzun birebir dijitalleşmiş halidir:

* **1-31 Günlük Hücreler:** Tabloda her bir üreticinin ayın 1'inden 31'ine kadar her gün kaç litre süt verdiği satır satır yer alır.
* **Hızlı Hücre Düzenleme:** Herhangi bir güne ait rakamın üzerine tıkladığınızda açılan pencereden o günkü süt litresini anında güncelleyebilirsiniz.
* **Otomatik Hakediş Hesaplama:**
  * **Toplam Litre:** Üreticinin ay boyunca verdiği toplam süt.
  * **Birim Fiyat:** Üretici bazlı belirlenen süt litre fiyatı.
  * **Toplam Tutar:** Toplam kazanılan brüt para.
  * **Yem / Avans Kesintisi:** Üreticiye önceden yem verildiyse veya avans çekildiyse kesinti tutarı.
  * **Net Ödenecek:** Kesintiler düşüldükten sonra köylüye verilecek net para.
* **Filtreler:**
  * **Ay ve Yıl Seçimi:** Geçmiş aylara (Örn: Eylül, Ekim, Kasım) tek tıkla geçiş yapabilirsiniz.
  * **Bölge / Köy Filtresi:** Yanıkağıl, Kapaklı, Pınarça, Karaağaç gibi bölgelere göre sadece o köydeki üreticileri listeleyebilirsiniz.
  * **Gün Aralığı:** 1-15 arası (1. Dönem) veya 16-31 arası (2. Dönem) olarak çizelgeyi bölebilirsiniz.

---

## 👥 5. Müşteri & Üretici Yönetimi (👥 Müşteriler)

Köylülerin ve müşterilerin sisteme kaydedildiği ve cari hesaplarının tutulduğu bölümdür:

### Yeni Müşteri / Üretici Ekleme:
1. Üst menüden **"👥 Müşteriler"** sekmesine tıklayın.
2. **Ad Soyad:** Köylünün adı ve soyadı.
3. **Kullanıcı Adı:** Sisteme girerken kullanacağı isim (Türkçe karakter içermeyen küçük harf önerilir: örn: `ahmet`, `mehmet_koc`).
4. **Giriş Şifresi:** Üreticinin kendi paneline girmesi için şifre (örn: `1234` veya `5959`).
5. **Telefon:** WhatsApp bildirimleri veya iletişim için cep telefonu.
6. **Bölge / Köy:** Yanıkağıl Köyü, Kapaklı Merkez vb.
7. **Özel Fiyat (Opsiyonel):** Bu üreticiye genel fiyattan farklı bir fiyat verilecekse (örn: 24.50 ₺).
8. **"Müşteriyi Kaydet"** butonuna basın.

### Bakiye & Hakediş Ödemesi Düşme:
* Müşteri listesinde her köylünün sağında **"💳 Ödeme Yap"** butonu bulunur.
* Köylüye para ödediğinizde veya avans verdiğinizde bu butona basarak ödeme tutarını girin; sistem bakiyesini otomatik olarak günceller.

---

## ⚙️ 6. Hızlı Fiyat & Şifre Güncelleme

### Fiyatları Değiştirme:
* Üst menü çubuğunda yer alan **"Fabrika: 28.00 ₺"** ve **"Halk: 23.00 ₺"** etiketlerinin yanındaki **"✏️ Fiyat Değiştir"** butonuna tıklayın.
* Fabrikaya Satış Fiyatını ve Köylüden Alış Fiyatını girip kaydedin.
* Tüm sistem ve hesaplamalar anında yeni fiyata göre güncellenir.

### Yönetici Şifresini Değiştirme:
* Sağ üstte adınızın yanındaki kilit/anahtar simgesine tıklayın.
* Yeni şifrenizi belirleyip kaydedin.

---

## 🖨️ 7. Rapor İndirme (Excel, PDF & E-posta Raporu)

Aylık Çizelge sekmesinde üstte yer alan yeşil ve kırmızı butonlarla raporlama yapabilirsiniz:

1. **📄 A4 Yatay PDF / Yazdır (Kırmızı Buton):**
   * Tek tıkla matrisi resmi muhasebe formatında yatay A4 boyutunda PDF olarak kaydeder veya doğrudan yazıcıya gönderir.
2. **📗 Excel Olarak İndir (Yeşil Buton):**
   * Çizelgedeki tüm günleri, köylü isimlerini, litreleri ve para hesaplarını `.xls / .csv` formatında bilgisayarınıza indirir.
3. **📧 E-posta Olarak Gönder (Mavi Buton):**
   * Raporu doğrudan fabrikanın, muhasebecinizin veya kendi e-posta adresinize tek tıkla e-posta ile ulaştırır.

---

## 📱 8. Müşteriler / Köylüler Sistemi Nasıl Kullanır?

Köylülerin ve süt veren üreticilerin güvenini kazanmak için şeffaf bir müşteri portalı bulunur:

1. Köylü telefonundan siteye girer ([https://senlikciftligi.vercel.app/](https://senlikciftligi.vercel.app/)).
2. Sağ üstteki **"👤 Müşteri Portalı"** butonuna basar.
3. Kendisine verdiğiniz **Kullanıcı Adı** ve **Şifre** ile giriş yapar.
4. **Köylünün Göreceği Ekran:**
   * Yalnızca ve yalnızca kendisine ait süt teslim tarihlerini ve litrelerini görür.
   * Toplam alacağı parayı, ödenen tutarı ve kalan bakiyesini canlı olarak takip eder.
   * Asla diğer köylülerin bilgilerini veya çiftliğin fabrika gelirlerini göremez.

---

## ☁️ 9. Firebase Veritabanında Kayıtları İzleme

Verileriniz Google Cloud Firestore üzerinde güvenle tutulur:
1. **[Firebase Console](https://console.firebase.google.com/)** sayfasına gidin.
2. **`ciftliksut-d6398`** projesini seçin.
3. Sol menüden **Firestore Database** bölümünü açın:
   * **`admin_hesaplari` :** Kayıtlı yöneticilerinizin e-postaları, şifreleri ve oluşturulma tarihleri.
   * **`musteriler_<admin_maili>` :** Eklediğiniz üretici köylüler.
   * **`kayitlar_<admin_maili>` :** Günlük süt teslimatları ve matris hücreleri.
   * **`ayarlar_<admin_maili>` :** Süt litre alış ve satış fiyatları.

---

## 📍 İletişim & Lokasyon Bilgileri
* **Çiftlik Adresi:** ŞENLİK BESİ VE ÜRETİM ÇİFTLİĞİ, Yanıkağıl Köyü, 59510 Kapaklı / Tekirdağ
* **Şarküteri / Dükkan:** Atatürk Mahallesi, Koru Sokak No: 57, Kapaklı / Tekirdağ
* **WhatsApp Destek & Sipariş:** [+90 542 715 59 04](https://wa.me/905427155904)
