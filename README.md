# Tugasan PdPR SK Taman Daya — GitHub Pages + CSV

Versi terkini mempunyai lencana sekolah, bunyi permainan dan bacaan tugasan/penghantaran terus daripada CSV Google Sheet. Tiada proses build diperlukan.

## Terbitkan / kemas kini

1. Ekstrak ZIP. Muat naik semua fail di dalamnya ke bahagian utama repositori GitHub; jangan muat naik ZIP sahaja.
2. Pastikan `index.html`, `app.js`, **`data.js`**, `style.css`, `roster.json` dan `lencana-sk-taman-daya.jpeg` berada bersama di root. Fail `data.js` baharu wajib dimuat naik.
3. Commit perubahan. Dalam **Settings → Pages**, pilih **Deploy from a branch → main → /(root) → Save**. Jika branch utama anda bernama lain, pilih branch tersebut.
4. Apabila deployment selesai, klik **Visit site**. Untuk GitHub Free, repositori Public diperlukan bagi GitHub Pages.

[Dokumentasi GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Sambungan data

URL CSV tugasan dan CSV penghantaran yang diberikan telah ditetapkan sebagai lalai. Status pada portal menunjukkan **CSV Google Sheet**. Data cache boleh dipaparkan segera, bacaan baharu berjalan di latar, dan tapisan tidak memerlukan panggilan Apps Script.

Gunakan **⚙ Tetapan sambungan** untuk menukar URL CSV atau Apps Script pada pelayar semasa. Untuk menukar lalai bagi semua pengguna, ubah `TASKS_CSV`, `SUBMISSIONS_CSV` atau `DEFAULT_API` dalam `app.js` dan commit semula.

Login, simpanan dan butiran gambar kekal melalui Apps Script. `Code.gs` disediakan berasingan dan tidak perlu ditukar untuk kemas kini bacaan ini jika backend sistem sudah dipasang. Rekod yang telah disahkan berjaya disimpan dikekalkan secara tempatan sehingga penerbitan CSV menyusul.

Kata laluan guru ditetapkan pada **Apps Script → Project Settings → Script Properties → TEACHER_PASSWORD**. Mod demo menggunakan simulasi yang berasingan dan rekod demo hanya disimpan dalam pelayar.

## Masa kemas kini

Segar semula automatik berjalan setiap 60 saat ketika laman kelihatan. Butang **Segar semula** meminta bacaan baharu tanpa menutup paparan. Google boleh mengambil beberapa minit untuk mengemas kini CSV yang diterbitkan. Pengguna pada pelayar lain melihat perubahan selepas penerbitan itu dan bacaan seterusnya. Aktifkan **Automatically republish when changes are made** pada tetapan Publish to web Google Sheet.

Baca `PANDUAN-CSV.md` untuk butiran tingkah laku cache, status penghantaran dan penyelarasan selepas simpanan.

## Pembetulan semakan guru

Versi ini turut membetulkan sesi guru yang tamat ketika membuka hasil kerja murid. Pasang **Code-Semakan-Guru.gs** pada projek Apps Script dan kemas kini fail laman. Fail backend dibekalkan berasingan, bukan untuk GitHub Pages. Ikuti `PANDUAN-SEMAKAN.md`.

## Semakan pantas

Rekod penghantaran kini mempunyai bintang, markah dan mesej terus pada senarai, carian murid, tapisan status dan 12 rekod setiap halaman. Gambar hanya diminta apabila **Pratonton** ditekan. Dialog menyertakan **Besarkan gambar** dan **Simpan & seterusnya**. Baca `PANDUAN-SEMAKAN-PANTAS.md`.
