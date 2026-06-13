# Online Oyun Platformu - Agent Notları

Bu proje, arkadaş gruplarının aynı ortamda telefondan veya bilgisayardan girip birlikte oynayacağı basit çok oyunculu mini oyun platformudur.

## Teknik yapı

* Frontend: React + Vite + JavaScript
* Styling: Tailwind CSS
* Backend: Node.js + Express + Socket.io
* Veritabanı yok
* Oyun state’i RAM’de tutulur
* Frontend deploy hedefi: Vercel
* Backend deploy hedefi: Render Free

## Genel kurallar

* Her oyun ayrı klasörde tutulur.
* App.jsx içine oyun mantığı gömülmez.
* main.jsx / index.jsx içine data veya JSON gömülmez.
* Data dosyaları ayrı `data/` klasöründe tutulur.
* Socket bağlantısı tek yerden yönetilir.
* Çalışan socket event isimleri gereksiz yere değiştirilmez.
* Mevcut çalışan oyun akışı refactor sırasında bozulmaz.
* Tailwind kullanılır.

## Frontend hedef yapı

frontend/src/

* App.jsx
* main.jsx
* components/

  * ServerWakeScreen.jsx
  * HomeScreen.jsx
  * GameCard.jsx
* games/

  * WordLadder/

    * WordLadder.jsx
  * ClosestGuess/

    * ClosestGuess.jsx
* data/

  * closestQuestions.js
* socket/

  * socket.js

## Oyunlar

### 1. Kelime Merdiveni

2 kişilik oyundur.

Oyuncular kendi listelerini hazırlar. Her oyuncunun maksimum 10 satırlık kelime/harf listesi olur. İki oyuncu da hazır olunca listeler yan yana görünür. Kazanan manuel seçilir ve puan alır.

### 2. Kim Daha Yakın

Sayı tahmin oyunudur.

Host kategori ve süre seçer. Sistem sayı cevaplı bir soru gösterir. Oyuncular süre bitmeden tahmin girer. Süre bitince doğru cevaba en yakın oyuncu otomatik kazanır.

Modlar:

* Hazır Sorular
* Kendi Oyununu Yarat

Hazır Sorular modunda host da oynar.

Kendi Oyununu Yarat modunda admin soruyu ve doğru cevabı yazar, ama o turda oyuncu olmaz.

## Kim Daha Yakın kategorileri

* Nüfus
* Yıl
* Kilometre
* Yaş
* Rekor

## Admin sistemi

* Odayı kuran kişi admin olur.
* Admin başka oyuncuya adminliği verebilir.
* Admin oyun modu, kategori, süre, soru başlatma ve sonraki tur işlemlerini yönetir.
* Kendi Oyununu Yarat modunda admin sadece soru yazar ve yayınlar.

## Tasarım dili

Koyu tema. Arka plan siyaha yakın mat. Kartlar arka plandan biraz daha açık mat gri tonlarında. Mobil uyumlu, sade ve modern görünüm.

## Önemli not

Yeni özellik eklerken önce mevcut yapıyı koru. Büyük dosyalara yeni kod yığma. Gerekirse küçük componentlere böl ama gereksiz mimari kurma.
