# Tugasan PdPR SK Taman Daya

Sistem bertema permainan Mario: tiga tab utama (Saya murid, Saya guru, Rumusan) dan empat tab dalam ruang guru. Fail disediakan untuk dipasang sendiri; projek Apps Script, Sheet rekod dan folder Drive anda belum diubah.

## Fail yang disediakan

- `Code.gs` — backend Apps Script: baca dan simpan tugasan, penghantaran, gambar, bintang, markah dan respon.
- `Index.html` — antaramuka lengkap dalam satu fail, termasuk CSS, JavaScript dan salinan senarai nama untuk fallback/demo. Sesuai dimasukkan sebagai fail HTML bernama `Index` dalam projek Apps Script.
- `appsscript.json` — tetapan runtime V8, zon masa Asia/Kuala_Lumpur dan skop Google yang diperlukan.
- `web/` dalam ZIP — versi laman statik dengan `index.html`, `style.css`, `app.js` dan `roster.json`.

## Cara paling mudah: seluruh sistem pada Apps Script

1. Buka projek Apps Script menggunakan akaun yang mempunyai akses sunting ke Google Sheet rekod dan folder Drive yang diberikan.
2. Gantikan kandungan `Code.gs` dengan fail yang disediakan. Elakkan fungsi `doGet`, `doPost` atau `api` berganda dalam fail lain.
3. Tambah fail **HTML** bernama **Index** dan tampal seluruh kandungan `Index.html`. Kod antaramuka telah digabungkan; tiada fail CSS/JS tambahan diperlukan dalam editor Apps Script.
4. Dalam **Project Settings**, pilih zon masa **Asia/Kuala_Lumpur**. Jika menggunakan manifest yang dibekalkan, aktifkan paparan `appsscript.json` dan salin kandungannya.
5. Pilih fungsi **setup**, kemudian **Run**. Lengkapkan kebenaran Google bagi akaun pemilik. Fungsi ini mewujudkan dua tab sistem, menyemak folder dan menetapkan kata laluan guru awal kepada **JBA1077**.
6. Gunakan **Deploy → Manage deployments**, pilih deployment sedia ada, klik ikon edit dan pilih **New version**. Jenisnya **Web app**, **Execute as: Me**. Pilih khalayak yang dibenarkan sekolah; akses **Anyone** diperlukan untuk versi statik memanggil API tanpa login Google. Pilihan tersedia bergantung pada polisi akaun sekolah. Kemudian klik **Deploy**. Untuk projek baharu, gunakan **Deploy → New deployment → Web app**.
7. Buka URL **/exec**. Jika fail `Index` tersedia, portal terus dipaparkan dan menggunakan `google.script.run` untuk komunikasi dengan backend, seperti dalam [dokumentasi rasmi Google](https://developers.google.com/apps-script/guides/html/communication). Kaedah ini juga mengelakkan isu CORS antara laman statik dan Apps Script.

Langkah deployment dan identiti pelaksana dirujuk daripada [panduan Web Apps Google](https://developers.google.com/apps-script/guides/web). Kod belum dipasang atau dideploy bagi pihak anda, mengikut permintaan.

## Jika menggunakan portal statik / pratonton Sites

URL Apps Script yang diberikan sudah ditetapkan sebagai sambungan lalai. Selepas `Code.gs` dipasang dan deployment dikemas kini:

1. Buka ikon **⚙ Tetapan sambungan** pada portal.
2. Kekalkan URL asal jika deployment sama, atau masukkan URL baharu yang berakhir dengan `/exec`.
3. Klik **Simpan & sambung semula**.
4. Portal perlu menunjukkan **Google Sheet disambungkan**. Jika dibuka melalui Apps Script `Index`, tetapan URL tidak diperlukan kerana RPC menggunakan projek yang sama.

Endpoint API mengembalikan JSON, bukan HTML. Anda boleh menyemak URL deployment dengan tambahan `?action=health`; respons sepatutnya mengandungi `"ok":true`, `"service":"pdpr-sktd"` dan `"version":1`. Content Service menggunakan redirect ke domain Google, seperti diterangkan dalam [dokumentasi Google](https://developers.google.com/apps-script/guides/content).

Jika portal statik gagal membaca respons kerana sekatan pelayar atau polisi domain Google, buka portal melalui URL Apps Script menggunakan fail `Index` yang dibekalkan. Jangan guna `mode: no-cors` untuk menutup ralat: respons legap tidak membolehkan sistem mengesahkan simpanan.

Laman Sites didaftarkan sebagai peribadi kepada pemilik. Penerbitannya belum berjaya: penghantaran sumber disekat oleh dasar kelulusan automatik sesi ini. Gunakan fail HTML atau pakej web yang dibekalkan. Ia belum dibuka untuk semua murid. Penggunaan sekolah boleh melalui URL Web App Apps Script selepas pemilik menetapkan akses deployment yang sesuai.

## Lokasi data sebenar

- **Google Sheet:** `1n2p-QRxv9qGD8toXZuNNxGWjI2wpIt0qhIOg4eGnIcE`
- **Folder gambar:** `14HeylvuhjmbhF4E3EaOcJ-wDzMoM5L2U`
- **PDPR_Tugasan:** satu baris bagi satu tugasan dan kelas; termasuk ID unik, tarikh, kelas, subjek, guru, arahan, pesanan dan status padam.
- **PDPR_Penghantaran:** satu baris bagi setiap murid dan tugasan; termasuk mesej, metadata fail Drive, bintang, markah dan respon.

Kod hanya menggunakan dua tab bernama tersebut. Jangan tukar susunan atau nama tajuk lajurnya. Padam tugasan menggunakan soft delete: tugasan hilang daripada paparan tetapi rekod terdahulu dan gambar dikekalkan untuk rujukan.

Senarai sumber semasa mengandungi **338 murid, 12 kelas dan 25 guru**. Backend mengambil CSV semula dan menggunakan cache sehingga lima minit. `roster.json` dan data dalam `Index.html` ialah salinan semasa untuk fallback dan demo; data sebenar selepas sambungan aktif diambil daripada backend.

## Aliran penggunaan

**Murid:** pilih kelas dan nama. Tugasan hari ini dipaparkan mengikut zon masa Malaysia. Pilih tarikh lain untuk melihat tugasan terdahulu. Klik **Hantar tugasan**, isi mesej dan/atau lampirkan sehingga empat gambar, kemudian hantar. Butang penghantaran digantikan dengan status dan **Lihat rekod**. Bintang, markah dan mesej muncul selepas guru menyemak; klik **Lihat tugasan** atau buka semula tab untuk memuat semula rekod.

**Guru:** login dengan **JBA1077**. Cipta tugasan untuk kelas, tarikh, subjek dan nama guru yang dipilih. Arahan menerima teks serta pautan `https://` atau `http://` yang dijadikan pautan boleh klik. Tab kemaskini menyediakan edit/padam. Rekod penghantaran membolehkan semakan gambar, 0–5 bintang, markah pilihan 0–100 dan mesej. Rumusan penghantaran memadankan semua nama murid kelas dengan setiap tugasan, termasuk **Hantar / Tidak hantar**, serta eksport CSV.

**Rumusan utama:** matriks kelas × subjek dengan bilangan tugasan yang diberikan oleh guru. Tapis kelas, subjek dan tarikh. `—` bermaksud tiada tugasan direkodkan bagi tapisan itu; sistem tidak mempunyai jadual waktu rasmi sekolah.

## Mod demo dan gambar

- Klik **Cuba mod demo** untuk mencuba semua aliran tanpa menulis ke Google Sheet atau Drive. Contoh tugasan disediakan untuk **1 JUPITER** pada hari mod demo mula diaktifkan.
- Rekod demo hanya disimpan dalam pelayar yang sama. Semua perubahan dalam demo dilabel dengan jelas. Jangan gunakan demo bagi penghantaran sebenar.
- Gambar JPG, PNG dan WebP diterima: maksimum empat, sehingga 10 MB setiap fail sebelum dimampatkan. Pelayar mengecilkan gambar kepada maksimum 1,400 piksel dan menukarnya kepada JPEG; backend turut memeriksa had saiz dan format.
- Kod tidak menjadikan fail Drive awam. Gambar dimuatkan melalui endpoint butiran rekod selepas semakan token guru atau padanan nama/kelas murid. Kebenaran folder Drive sedia ada tetap terpakai.

## Model akses yang diminta

Ruang guru menggunakan token pelayan yang luput selepas maksimum enam jam atau apabila cache dibuang. Kata laluan sebenar disimpan dalam Script Properties sebagai `TEACHER_PASSWORD` selepas setup; nilai dalam JavaScript laman hanyalah untuk simulasi login mod demo.

Murid dikenali melalui pilihan nama dan kelas, sebagaimana spesifikasi. Tiada pengesahan identiti peribadi: sesiapa yang memilih nama yang sama boleh menggunakan identiti itu. Had satu penghantaran dilaksanakan di backend dengan Script Lock dan padanan ID tugasan + kelas + nama. Untuk pengesahan identiti yang lebih ketat, aliran login murid perlu ditambah kemudian.

## Pengesahan yang telah dibuat

- Semakan sintaks JavaScript antaramuka dan backend.
- **24 semakan backend dengan mock Google services**, termasuk login, simpan/baca, permintaan berulang, tolak tarikh tidak sah, had gambar, penghantaran berganda, akses rekod, bintang/markah, edit dan soft delete.
- Ujian pelayar mod demo: pilih murid, muat naik gambar, hantar tugasan, semakan guru, simpan respon, cipta tugasan serta rumusan nama murid.
- Sambungan simpan/baca menggunakan Sheet dan Drive sebenar **belum diuji**, kerana backend belum dipasang. Selepas pemasangan, lakukan satu tugasan dan penghantaran percubaan dalam sistem sebenar, kemudian semak dua tab rekod dan folder gambar.

## Bunyi permainan pada butang

Bunyi diaktifkan secara lalai dan bermula selepas interaksi pertama, mengikut keperluan pelayar. Klik biasa memainkan nada pendek, pertukaran tab memainkan bunyi syiling, pilihan bintang memainkan nada penghargaan, dan simpanan yang disahkan berjaya memainkan melodi pendek. Permintaan yang gagal memainkan nada ralat. Butang yang dilumpuhkan dan bacaan data latar tidak memainkan bunyi.

Klik ikon **🔊 / 🔇** di bahagian atas untuk aktifkan atau senyapkan bunyi. Pilihan disimpan pada pelayar yang sama dan kekal selepas muat semula. Bunyi dijana secara tempatan menggunakan Web Audio; tiada fail audio atau muat turun tambahan diperlukan. Kemas kini fail `Index` jika menggunakan Apps Script, atau fail `web/` jika menggunakan versi statik. `Code.gs` tidak berubah untuk kemas kini bunyi ini.

## Menetapkan atau menukar kata laluan guru

1. Buka projek Apps Script yang menggunakan fail `Code.gs` ini.
2. Klik **Project Settings** (ikon gear di sebelah kiri).
3. Skrol ke **Script Properties**, kemudian klik **Add script property** atau **Edit script properties**.
4. Isi **Property**: `TEACHER_PASSWORD`.
5. Isi **Value**: kata laluan guru pilihan anda, contohnya nilai awal `JBA1077`.
6. Klik **Save script properties**. Gunakan nilai tersebut untuk login guru dalam mod sambungan sebenar.

Jika belum menjalankan `setup()`, jalankannya dahulu sebagai pemilik projek. Fungsi ini menetapkan nilai awal `JBA1077` hanya jika `TEACHER_PASSWORD` belum wujud; kata laluan yang telah anda tetapkan tidak ditimpa. Tetapan kata laluan dikongsi oleh semua guru dalam sistem ini. Mod demo pada HTML menggunakan `JBA1077` dan tidak membaca Script Properties.

Pengurusan tetapan ini mengikuti [dokumentasi Script Properties Google](https://developers.google.com/apps-script/guides/properties#manage_script_properties_manually).

## Lencana sekolah

Lencana Sekolah Kebangsaan Taman Daya yang dibekalkan telah dipasang pada kepala laman dan ikon pelayar. Imej asal digunakan tanpa perubahan reka bentuk. Versi `web/` menggunakan fail `lencana-sk-taman-daya.jpeg`; versi `Index.html` membenamkan imej terus supaya lencana turut dipaparkan apabila satu fail HTML sahaja dipindahkan atau dimasukkan ke Apps Script.
