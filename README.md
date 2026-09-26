# CleanRead

Sınıf → ders → sayfa numarası seçerek kitap cevaplarını okunaklı biçimde gösteren, üç ayrı ekrandan oluşan statik bir site. Tüm dosyalar tek klasörde (kök dizinde) durur, kolayca düzenlenebilsin diye alt klasör yok.

## Klasör yapısı

```
CleanRead/
├── index.html      Ekran 1 — sınıf seçimi (9/10/11/12)
├── ders.html        Ekran 2 — seçilen sınıfın dersleri
├── oku.html          Ekran 3 — sayfa numarası girme ve cevapları görüntüleme
├── style.css        Ortak Material Design 3 tasarım sistemi
├── app.js            Ortak mantık (veri yükleme, içerik çekme, HTML ayrıştırma, lightbox)
├── kitaplar.json    Sınıf/ders/kitap listesi — tek düzenlenecek yer burası
└── logo.png          ← buraya kendi 450×300 logonu ekle
```

## Ders/kitap eklemek ya da çıkarmak

Her şey `kitaplar.json` içinde. Yeni bir ders eklemek için ilgili sınıfın dizisine şu şekilde bir kayıt ekle:

```json
{
  "id": "matematik",
  "ad": "Matematik",
  "yayin": "MEB Yayınları",
  "ikon": "calculate",
  "url": "https://evvelcevap.com/9-sinif-matematik-ders-kitabi-cevaplari-meb-yayinlari-sayfa-{sayfa}/"
}
```

- **id**: benzersiz, boşluksuz bir kısaltma (URL'de görünür).
- **url** içindeki `{sayfa}` yerine, kullanıcının girdiği sayfa numarası otomatik olarak yazılır.
- **ikon**: [Material Symbols](https://fonts.google.com/icons) adı — örn. `calculate`, `public`, `biotech`, `science`, `history_edu`, `translate`.
- Bir dersi kaldırmak için ilgili kaydı silmen yeterli.

Şu an sadece **11. sınıf → Türk Dili ve Edebiyatı** gerçek bir kayıtla dolu; diğerleri boş dizi (`[]`) olarak bırakıldı, kendi bildiğin gerçek adresleri ekle.

## Logo

450×300 boyutundaki logonu `logo.png` adıyla bu klasöre koy. Logo zaten "CleanRead" yazısını içerdiği için arayüzde ayrıca metin olarak tekrar yazılmıyor, sadece görsel kullanılıyor. Dosya henüz yoksa üst çubukta boş bırakılır, site yine çalışır.  

## GitHub Pages'te yayınlama

1. Bu klasördeki tüm dosyaları bir GitHub deposunun köküne yükle.
2. Depo **Settings → Pages** kısmında **Branch**'i `main` (ya da kullandığın dal) ve klasörü `/root` seçip kaydet.
3. Birkaç dakika sonra `https://kullaniciadi.github.io/depo-adi/` adresinden erişilebilir olur.

## Yerelde test etme

`kitaplar.json` `fetch()` ile okunduğu için dosyayı doğrudan çift tıklayıp (`file://`) açarsan tarayıcı bunu CORS nedeniyle engeller. Yerelde denemek için klasörün içinde basit bir sunucu başlat, örneğin:

```bash
python -m http.server 8000
```

sonra `http://localhost:8000/` adresini aç.

## İçeriğin alınması

İçerik, `assets/app.js` içinde sabitlenmiş tek bir uç nokta (kendi Cloudflare Worker'ın) üzerinden alınır. Kullanıcı arayüzünde bu konuda hiçbir ayar veya teknik ayrıntı gösterilmez — kullanıcı yalnızca sınıf, ders ve sayfa numarası seçer. Uç noktayı değiştirmek istersen `assets/app.js` içindeki `SOURCE_ENDPOINT` sabitini güncellemen yeterli.
