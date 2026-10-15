# Kemas kini bacaan CSV — Tugasan PdPR SK Taman Daya

Versi ini membaca senarai tugasan dan penghantaran terus daripada dua pautan CSV Google Sheet yang diberikan. Login guru, simpan/edit/padam tugasan, penghantaran murid, respon dan gambar terus menggunakan Apps Script sedia ada.

## Pasang pada GitHub Pages

1. Ekstrak `PDPR-SK-Taman-Daya-GitHub-Pages-CSV.zip`.
2. Gantikan fail di bahagian utama repositori GitHub dengan semua fail dari ZIP: `index.html`, `app.js`, **`data.js`**, `style.css`, `roster.json`, lencana dan README. Fail `data.js` ialah fail baharu yang wajib dimuat naik bersama fail lain.
3. Commit perubahan. Kekalkan tetapan Pages **main → /(root)**.
4. Selepas deployment GitHub siap, muat semula laman. Bar sambungan sepatutnya menunjukkan **CSV Google Sheet**, jumlah tugasan/penghantaran dan masa CSV dibaca.
5. Jika perlu, buka **⚙ Tetapan sambungan** untuk menyemak URL CSV tugasan, CSV penghantaran dan URL Web App Apps Script. Kedua-dua pautan CSV baharu telah ditetapkan sebagai lalai dalam fail ini.

Untuk versi yang dihoskan sepenuhnya melalui Apps Script, gantikan fail HTML **Index** dengan kandungan `Index.html` terkini, kemudian deploy versi baharu. Semua CSS, JavaScript, lencana dan salinan roster sudah dibenamkan dalam satu fail tersebut. Kod backend `Code.gs` tidak perlu diubah untuk kemas kini bacaan ini jika ia sudah menggunakan backend sistem ini.

## Apa yang lebih pantas

- Senarai nama boleh digunakan daripada salinan tersedia tanpa menunggu Apps Script.
- Dua CSV rekod dibaca secara selari. Setiap sumber mempunyai status berasingan; kegagalan satu sumber tidak memadam data sumber yang lain.
- Cache metadata dalam pelayar dipaparkan serta-merta pada lawatan berikutnya. Bacaan baharu berjalan di latar.
- Pertukaran nama murid, tarikh, kelas, subjek dan tab menapis data yang tersedia secara tempatan. Ia tidak perlu menunggu panggilan Apps Script senarai data.
- Permintaan CSV serentak digabungkan, dan bacaan biasa dijarakkan sekurang-kurangnya 20 saat. Segar semula automatik berjalan setiap 60 saat semasa laman kelihatan. Butang **Segar semula** meminta bacaan baharu tanpa menutup paparan.
- Borang cipta tugasan dan dialog terbuka tidak dibina semula oleh kemas kini latar, supaya teks yang sedang ditaip kekal.
- Semakan penghantaran dalam rumusan menggunakan indeks supaya tidak mencari keseluruhan senarai bagi setiap sel.
- Senarai murid/guru turut disemak melalui CSV sumber asal di latar, dengan cache lima minit.

## Data yang baru disimpan

Perubahan hanya dimasukkan ke paparan segera selepas backend mengesahkan simpanan berjaya. Tiada status berjaya diberikan hanya berdasarkan klik butang.

Selepas simpanan disahkan, paparan dan cache tempatan mengekalkan rekod baharu itu sementara menunggu penerbitan CSV menyusul. Ini termasuk tugasan baharu, edit, padam, penghantaran murid dan respon guru. CSV lama tidak terus membatalkan status penghantaran yang baru disahkan atau memunculkan semula tugasan yang baru dipadam.

Apabila CSV memaparkan rekod yang sepadan atau suntingan pelayan yang lebih baharu, salinan sementara itu diselaraskan. Penampan rekod disahkan dihadkan kepada 24 jam; pastikan CSV dan Apps Script merujuk Sheet yang sama serta penerbitan automatik diaktifkan. Penampan pada satu pelayar tidak dihantar kepada pelayar lain; pengguna lain melihat perubahan apabila CSV diterbitkan.

Gambar tidak dimuat turun bersama setiap senarai. Gambar dibaca melalui Apps Script apabila **Lihat rekod** atau **Semak** dibuka. Butiran yang sama boleh digunakan semula dalam memori sehingga 30 saat bagi identiti sesi yang sama. Cache metadata tidak menyimpan kandungan gambar base64, kata laluan atau token sesi.

Jika CSV penghantaran belum pernah berjaya dimuatkan, sistem tidak menanda semua murid sebagai “Tidak hantar”. Ia memaparkan status rekod belum tersedia dan menunggu bacaan tersebut. Jika bacaan baharu gagal tetapi cache sudah ada, paparan lama dikekalkan dengan mesej ralat pada bar sambungan.

## Had masa penerbitan Google

Bacaan pertama pada pelayar baharu masih memerlukan rangkaian. GitHub Pages dan cache mengurangkan menunggu pada paparan, tetapi tidak menjadikan semua rangkaian serta-merta.

Google menyatakan kemas kini versi yang diterbitkan boleh mengambil beberapa minit. `Segar semula` mengambil versi CSV yang tersedia; ia tidak memaksa Google menerbitkan Sheet serta-merta. Di Google Sheet, semak **File → Share → Publish to web → Published content & settings → Automatically republish when changes are made**. [Rujukan Google](https://support.google.com/docs/answer/183965?hl=en)

Masa “Dibaca” pada sistem ialah masa CSV diambil, bukan masa semua suntingan Sheet telah selesai diterbitkan. Pelayar yang sama melihat simpanannya selepas pengesahan backend; pelayar/peranti lain menunggu penerbitan CSV dan bacaan seterusnya.

## Sumber lalai

**Tugasan:**
https://docs.google.com/spreadsheets/d/e/2PACX-1vRLTpPsHDnSTydY1NZjQ47ZZCaFL5Sw-QxCJFo9A5EsY2bkF1bZLoRmbiUACAOr7jTRUg41Gb6L9_HT/pub?gid=1736275344&single=true&output=csv

**Penghantaran:**
https://docs.google.com/spreadsheets/d/e/2PACX-1vRLTpPsHDnSTydY1NZjQ47ZZCaFL5Sw-QxCJFo9A5EsY2bkF1bZLoRmbiUACAOr7jTRUg41Gb6L9_HT/pub?gid=1797850436&single=true&output=csv

Tajuk lajur CSV mesti dikekalkan mengikut tab sistem. Kod mengendalikan koma, petikan berganda dan arahan berbilang baris. Bacaan HTML/ralat atau lajur tidak sepadan tidak menggantikan cache sah dengan senarai kosong.

## Pengesahan versi ini

- Kedua-dua CSV sebenar dibaca dan dipadankan dengan struktur sistem.
- Ujian pelayar mengesahkan tugasan, rekod penghantaran dan respon guru dipaparkan daripada CSV, termasuk selepas muat semula daripada cache.
- Tapisan tarikh/kelas/subjek diuji tanpa lapisan loading pada ruang kerja.
- 28 semakan parser, cache, bacaan gagal/separa, penyelarasan simpanan, padam dan respon guru lulus menggunakan simulasi rangkaian/storan.
- Tiada tugasan, penghantaran atau gambar baharu ditulis ke Sheet/Drive sebenar semasa ujian kemas kini ini.
