# Pembetulan semakan hasil kerja guru — 16 Oktober 2026

## Punca ralat pada screenshot

Senarai penghantaran masih dipaparkan kerana bacaan CSV tidak menggunakan sesi guru Apps Script. Namun, membuka hasil kerja dan gambar memerlukan sesi guru yang sah.

Dalam kod terdahulu, apabila token sesi guru tamat atau tidak lagi wujud, fungsi butiran penghantaran tersalah beralih kepada semakan identiti murid. Permintaan guru tidak membawa nama/kelas murid seperti permintaan murid, lalu ralat “Nama murid dan kelas tidak sepadan dengan senarai sekolah” dipaparkan. Paparan ruang guru pula masih menganggap token lama di pelayar sebagai sesi aktif.

Ralat yang sama berjaya dihasilkan dalam ujian dengan membuang token sesi daripada cache backend. Ia bukan bukti bahawa nama murid dalam Sheet salah.

## Cara segera untuk versi lama

1. Klik **Log keluar** dalam ruang guru.
2. Login semula menggunakan kata laluan guru yang telah ditetapkan.
3. Buka **Rekod penghantaran**, pilih kelas/subjek/tarikh, kemudian klik **Semak**.

Langkah ini mendapatkan token baharu. Tidak perlu memadam nama murid, rekod penghantaran atau gambar.

## Pasang pembetulan kekal

**A. Kemas kini backend Apps Script**

1. Buka projek Apps Script yang digunakan oleh URL Web App sistem anda.
2. Gantikan kandungan fail **Code.gs** sedia ada dengan seluruh kandungan **Code-Semakan-Guru.gs** yang dibekalkan. Fail **Code.gs** dalam pakej lengkap juga sudah dikemas kini. Gantikan kandungan lama; jangan tambahkan satu lagi salinan fungsi yang sama di bawahnya.
3. Simpan. Kata laluan sedia ada dalam Script Properties kekal; tidak perlu menetapkan semula kata laluan atau menjalankan setup sekali lagi jika sistem sudah disediakan.
4. Buka **Deploy → Manage deployments**. Pilih deployment yang digunakan, klik ikon edit, pilih **New version**, kemudian **Deploy**. Kekalkan URL Web App yang sama supaya portal terus merujuk deployment tersebut.
5. Endpoint `?action=health` bagi versi ini memaparkan `version: 2`. [Rujukan deployment Web App](https://developers.google.com/apps-script/guides/web)

**B. Kemas kini portal GitHub Pages**

1. Ekstrak **PDPR-SK-Taman-Daya-GitHub-Pages-Semakan.zip**.
2. Gantikan semua fail laman di repositori dengan isi ZIP, termasuk `index.html`, `app.js`, `data.js`, `style.css`, roster dan lencana.
3. Commit, tunggu deployment Pages selesai dan muat semula laman. Jika kod lama masih digunakan, lakukan muat semula penuh pada pelayar.
4. Log keluar dan login guru semula sekali selepas kemas kini.

Fail `.gs` dipasang dalam editor Apps Script. Ia tidak perlu dimuat naik ke GitHub Pages. Jika seluruh portal dihoskan melalui Apps Script, gantikan juga kandungan fail HTML **Index** dengan **Index.html** terkini dan deploy versi baharu itu.

## Tingkah laku selepas pembetulan

- Permintaan guru disahkan sebagai guru sebelum butiran rekod dibaca. Label `actor: teacher` hanya memilih laluan pemeriksaan; akses tetap memerlukan token guru yang sah.
- Backend memberikan kod `AUTH_REQUIRED` dan mesej login semula apabila sesi tidak sah. Ia tidak lagi menyemak permintaan guru sebagai identiti murid.
- Portal menyimpan masa tamat sesi bersama token dalam session storage. Kata laluan tidak disimpan di situ.
- Jika sesi tamat ketika menekan **Semak**, popup **Login semula guru** dibuka. Selepas login berjaya, hasil kerja yang sama dibuka semula.
- Jika sesi tamat semasa menyimpan respon, dialog semakan asal, bintang, markah dan mesej yang telah ditaip dikekalkan di belakang popup login.
- Tindakan dicuba semula sekali sahaja selepas penolakan pengesahan yang jelas. Ralat rangkaian atau timeout tidak menyebabkan simpanan diulang secara automatik.
- Keserasian dengan mesej ralat backend lama disediakan khusus bagi permintaan semakan guru. Ralat identiti murid sebenar tidak dianggap sebagai sesi guru tamat.
- Butang Semak memaparkan **Membuka…** semasa menunggu, supaya klik berulang tidak diperlukan.

Sesi backend sedia ada menggunakan cache maksimum enam jam. Cache Google juga boleh kehilangan entri sebelum masa tamat, jadi portal tetap memeriksa penolakan backend dan meminta login semula apabila perlu. [Rujukan Cache Google](https://developers.google.com/apps-script/reference/cache/cache)

## Pengesahan

- **32 semakan backend** dengan simulasi Google services: termasuk sesi tamat, permintaan guru lama, penolakan akses tanpa token, login baharu, hak murid dan simpanan respon.
- **12 semakan pemulihan sesi frontend**: termasuk mesej backend lama, tiada ulangan tulis selepas timeout, kekalkan ID permintaan, pembatalan dan permintaan serentak menggunakan token lama.
- Ujian pelayar dalam salinan tempatan berasingan: sesi tamat → salah kata laluan → login berjaya → hasil kerja terbuka; sesi tamat ketika simpan respon → draft kekal → login berjaya → empat bintang, markah 90 dan mesej disimpan dalam data ujian.
- Tiada rekod, gambar, kata laluan atau deployment Google sebenar diubah semasa pembetulan ini. Kod dibekalkan untuk anda pasang, selaras dengan arahan asal.
