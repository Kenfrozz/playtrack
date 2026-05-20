# PlayTrack

PlayTrack, YouTube oynatma listeleri üzerinden ders takibi yapmanı sağlayan masaüstü bir uygulamadır. Electron, React, Vite ve SQLite kullanılarak geliştirilmiştir.

## Özellikler

- YouTube playlist URL'si ile ders ekleme
- Ders videolarını otomatik çekme
- İzlenen videoları işaretleme
- Ders bazlı ilerleme yüzdesi ve süre takibi
- Ders videolarını yenileme
- Yerel SQLite veritabanı ile veri saklama

## Teknolojiler

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- better-sqlite3

## Gereksinimler

- Node.js
- npm

## Kurulum

```bash
npm install
```

## Geliştirme Ortamında Çalıştırma

```bash
npm run dev
```

Alternatif olarak Windows üzerinde `run.bat` dosyası da kullanılabilir.

## Build Komutları

Uygulamayı derlemek için:

```bash
npm run build
```

Windows için portable paket üretmek için:

```bash
npm run dist
```

Sadece paket klasörü üretmek için:

```bash
npm run pack
```

## Uygulama Kullanımı

1. Uygulamayı aç.
2. `Ekle` butonu ile yeni ders oluştur.
3. Ders adı ve YouTube playlist bağlantısını gir.
4. Ders detayında videoları görüntüle.
5. İzlediğin videoları işaretleyerek ilerlemeni takip et.

## Veri Saklama

Uygulama verileri Electron user data klasöründe bulunan yerel SQLite veritabanında tutulur.
Veritabanı dosyası adı:

- `playtrack.db`

## Proje Yapısı

```text
src/
  main/        Electron ana süreç, veritabanı, servisler ve IPC handler'lar
  preload/     Renderer ile main process arasındaki köprü
  renderer/    React arayüzü
  shared/      Ortak tipler
resources/     Uygulama ikonları
```

## Notlar

- Ders videoları YouTube playlist verileri okunarak alınır.
- Playlist verileri alınamazsa ders yine eklenir, videolar daha sonra yenilenebilir.
