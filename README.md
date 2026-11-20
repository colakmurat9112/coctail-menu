# Modern Classics · Kokteyl Kitabı

Mixology Handbook ve Terpene Matrix serisinin üçüncü uygulaması. 100 modern klasik kokteyl, 13 zero-proof kokteyl ve onları besleyen 40 hızlı ev hazırlığı içerir. Hepsi pre-batch yapılabilir. Tadım defteri, menü taslağı ve haftalık hazırlık planı uygulamanın içindedir. İnternetsiz çalışır (PWA).

## Klasör yapısı
```
index.html            Arayüz ve stil
js/app.js             Sayfalar, batch ve maliyet hesapları, tadım defteri
data/items.json       Şişe ve mutfak malzemesi fiyatları (net, tahmini)
data/preps.json       40 ev hazırlığı
data/cocktails.json   15 aile, 100 kokteyl, 13 zero-proof
data/spritz.json      24 spritz (pour cost < %18)
data/shots.json       17 house shot (4,50 € bandı)
data/backbar.json     44 premium/niş şişe + köpüklü (kadeh/şişe)
data/snacks.json      19 aperitivo snack (%7 KDV)
sw.js                 Çevrimdışı önbellek
manifest.webmanifest, icons/
```

## GitHub Pages'e yükleme
1. `modern-classics` adıyla public bir repo aç.
2. Zip'in **içindekileri** yükle (`index.html` repo kökünde olmalı).
3. Settings → Pages → Branch `main`, klasör `/ (root)`.
4. Adres: `https://KULLANICI-ADIN.github.io/modern-classics/`

Handbook ve Terpene Matrix aynı hesaptaysa, menüdeki geri dönüş bağlantıları kendiliğinden çalışır.

## Kurallar ve hesaplar
- **Dilüsyon (tam batch):** Dave Arnold'un karıştırma denklemi kullanılır: d = −1,21x² + 1,246x + 0,145 (x = başlangıçtaki ABV oranı).
- **Saklama:** Son ABV %25'in altındaysa batch -18°C'de buzlanır. Kart bu durumda dondurucu yerine buzdolabı önerir.
- **Maliyet:** Tüm malzemelerin toplamına garnitür için €0,15 eklenir. Fiyatlar NET (KDV hariç) tahmini değerlerdir; Fiyatlar sayfasından değiştirebilirsin.
- **Haftalık prep yükü:** Menüdeki her kokteyl için haftalık porsiyon tahmini girilir. Uygulama bundan gereken hazırlık miktarını ve aktif süreyi hesaplar (limit: 240 dk).

## Yedek
Fiyatlar & Yedek sayfasından JSON dışa ve içe aktarabilirsin. Tüm notlar sadece o cihazda saklanır; telefon değiştirmeden önce yedek al.

## Güncelleme
`data/` dosyalarını düzenledikten sonra `sw.js` içindeki `VERSION` değerini artır (`"v2"`).

## KDV
İçecekler %19, yiyecekler (snack) 1 Ocak 2026'dan itibaren %7 KDV ile hesaplanır. Marj = (net satış − maliyet) ÷ net satış.
