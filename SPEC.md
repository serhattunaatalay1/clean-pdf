# SPEC: CleanPDF (Gizli, Hızlı & %100 İstemci Taraflı PDF İsviçre Çakısı)

## 1. Problem Tanımı
Milyonlarca insan her gün basit PDF işlemleri (birleştirme, sayfa ayırma, fotoğrafı PDF yapma, sayfa silme/döndürme) için iLovePDF, Smallpdf gibi siteleri kullanıyor. Bu siteler:
- Belgeleri kendi sunucularına yükleyerek gizlilik ve kişisel veri (KVKK/GDPR) ihlali yaratıyor.
- Günde 2-3 işlemden sonra paralı üyelik ve günlük limit dayatıyor.
- Rahatsız edici reklamlar ve yavaş yükleme süreleri içeriyor.

## 2. Kapsam Sınırları (Slop-Savar Çiti)

### ❌ Ne Yapmaz (Out-of-Scope)
- Kullanıcı hesabı, kayıt olma veya oturum açma mekanizması YOKTUR.
- Dosyaları alan veya saklayan herhangi bir bulut/backend sunucusu YOKTUR.
- Ağır sunucu tarafı OCR veya AI özetleme modelleri YOKTUR (amaç hafif, anlık belge manipülasyonu).
- Dış CSS/JS framework şişirmesi (React, Tailwind runtime, Bootstrap vb.) YOKTUR.

### ✅ Ne Yapar (In-Scope - Çekirdek Özellikler)
- **%100 İstemci Taraflı (Client-Side):** Tüm işlemler tarayıcının RAM'inde `pdf-lib` ve `PDF.js` ile gerçekleşir. İnternet bağlantısı olmasa dahi çalışır.
- **Modül 1: PDF Birleştir (Merge):** Birden fazla PDF'i sürükle-bırak, listede sırasını ayarla, tek tıkla birleştirip anında indir.
- **Modül 2: PDF Böl & Sayfa Ayıkla (Split):** PDF yükle, sayfaları görsel olarak gör veya aralık belirt (örn: `1-3, 5`), istenen sayfaları yeni PDF olarak indir.
- **Modül 3: Görselden PDF Yap (Image to PDF):** JPG, PNG veya WebP fotoğrafları sürükle; A4 veya orijinal boyutta sıralı PDF olarak kaydet.
- **Modül 4: Sayfa Düzenleyici (Organize, Rotate & Delete):** Sayfa önizlemeleri üzerinde ters sayfaları 90° çevir, gereksiz sayfaları çöp kutusu ikonuyla sil, kalanları indir.
- **Ultra Hafif & Şık Arayüz:** Modern Dark Mode, sürükle-bırak animasyonları, dosya boyutu ve sayfa sayısı göstergesi.
- **Tek Tıkla Çalıştırma:** Yerel `start.bat` ve dahili Node.js `server.js` (veya doğrudan `index.html` olarak herhangi bir tarayıcıda açılabilme).

## 3. Mimari ve Veri Akışı
```
[ Kullanıcı Dosyası (PDF / Görsel) ]
                 │ (Sürükle - Bırak / File Input)
                 ▼
     [ Tarayıcı Belleği: Uint8Array / ArrayBuffer ]
                 │
   ┌─────────────┴─────────────┐
   ▼                           ▼
[ pdf-lib (İşleme Motoru) ]  [ PDF.js (Thumbnail Render) ]
   │                           │
   │ (Merge/Split/Rotate)      │ (Canvas Üzerine Çizim)
   ▼                           ▼
[ Yeni PDF Blobu (Blob URL) ] [ Canlı Sayfa Önizlemesi ]
                 │
                 ▼
[ Otomatik İndirme: "temizlenmis.pdf" ]
```

## 4. Doğrulama ve Test Planı
1. `vendor/` scriptlerinin bütünlüğü ve offline çalışabilirliği.
2. Basit bir Node.js HTTP sunucusunun (`server.js`) port 3940 üzerinde hatasız açılıp statik dosyaları sunması.
3. Örnek PDF üretim ve birleştirme test betiğiyle PDF işlemlerinin doğrulanması.
4. `kod-denetci` ile Gotchas ve Windows ortam tuzaklarının taranması.
