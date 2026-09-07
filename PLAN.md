# PLAN: CleanPDF Geliştirme ve Doğrulama Adımları

- [ ] **Adım 1: Vendor Kütüphanelerini Hazırlama:** `pdf-lib.min.js`, `pdf.min.js` ve `pdf.worker.min.js` dosyalarını yerel `vendor/` klasörüne indirme (sıfır CDN bağımlılığı).
- [ ] **Adım 2: Arayüz ve Stil (UI/UX):** `index.html` ve `styles.css` ile minimalist, modern Dark Mode, sürükle-bırak destekli tab menülü arayüz inşa etme.
- [ ] **Adım 3: Çekirdek PDF Motoru (`app.js`):**
  - Dosya yükleme ve sürükle-bırak olayları.
  - Modül 1: Birleştirme (Merge) fonksiyonu.
  - Modül 2: Sayfa Ayıklama (Split) fonksiyonu.
  - Modül 3: Görselden PDF (Images to PDF) fonksiyonu.
  - Modül 4: Sayfa Önizleme, Döndürme ve Silme (Organize) fonksiyonu.
- [ ] **Adım 4: Yerel Sunucu & Başlatıcı:** `server.js` (Node yerleşik `http`, `fs`, `path`) ve `start.bat`.
- [ ] **Adım 5: Otonom Test & Doğrulama (Self-Healing):** Test komutu ile sunucunun ve istemcinin doğrulanması.
- [ ] **Adım 6: Kod Denetimi (kod-denetci):** Gotchas, bellek sızıntıları ve Windows uyumluluk taraması.
