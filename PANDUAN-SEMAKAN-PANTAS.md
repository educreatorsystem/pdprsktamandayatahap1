# Semakan pantas hasil kerja murid

Kemas kini 16 Oktober 2026 untuk bahagian **Saya guru → Rekod penghantaran**.

## Cara menggunakan

1. Pilih kelas, subjek dan tarikh. Gunakan carian nama murid/tajuk tugasan atau tapisan **Menunggu semakan** untuk mengecilkan senarai.
2. Setiap kad murid mempunyai bintang 1–5, markah 0–100 dan mesej guru. Guru boleh menyimpan penilaian terus daripada kad. Klik ↺ untuk mengosongkan bintang.
3. Tekan **Pratonton** untuk melihat gambar dan menilai dalam paparan yang sama. Gambar kecil bagi lampiran lain muncul selepas hasil kerja murid itu dibuka. Pilih gambar kecil untuk bertukar gambar; **Besarkan gambar** membolehkan guru meneliti gambar dengan menatal di kawasan gambar.
4. Tekan **Simpan penilaian** untuk menyimpan tanpa menukar murid. **Simpan & seterusnya** menyimpan dahulu, kemudian membuka murid berikutnya yang belum disemak dalam senarai tapisan/carian semasa. Ia boleh bergerak merentas halaman.
5. Butang **Mula semakan** membuka murid pertama yang belum disemak dalam pilihan semasa. Jika semua sudah disemak, ia membuka rekod pertama untuk semakan semula.
6. Rekod tanpa lampiran memaparkan **Lihat mesej** dan tidak membuat permintaan gambar.

Sekurang-kurangnya satu bintang, markah atau mesej perlu diisi sebelum penilaian dianggap selesai. Markah **0** diterima sebagai penilaian yang sah. Bintang dan markah tidak wajib diisi serentak.

## Prestasi

- Senarai memaparkan maksimum **12 kad** setiap halaman. Carian dan tapisan dilakukan pada metadata CSV yang telah dibaca.
- Senarai tidak memuatkan gambar hasil kerja secara automatik. Menukar halaman atau tapisan tidak mengambil gambar daripada Apps Script.
- Hanya hasil kerja murid yang dipilih diminta melalui `getSubmission`. Maksimum empat lampiran murid tersebut dikembalikan oleh backend sedia ada.
- Cache butiran gambar dibataskan kepada tiga rekod dengan tempoh guna semula 30 saat. Sesi baharu atau simpanan penilaian mengosongkan cache tersebut.
- Tiada permintaan gambar bagi murid seterusnya sehingga guru membuka rekod itu atau menekan **Simpan & seterusnya**.

Pendekatan ini mengurangkan beban tambahan daripada gambar dan jumlah borang pada skrin. Ia tidak menjamin semua pemuatan serta-merta: saiz CSV keseluruhan masih bertambah apabila rekod bertambah, dan pratonton pertama serta simpanan masih bergantung pada internet, saiz gambar dan masa respons Apps Script.

## Draf dan simpanan

- Draf bintang/markah/mesej dikekalkan ketika menukar halaman, carian, tapisan atau menutup pratonton dalam sesi laman yang sama.
- Draf belum dihantar ke Google Sheet sehingga guru menekan butang simpan. Ia hanya berada dalam memori laman dan hilang jika laman dimuat semula, ditutup, guru log keluar atau sambungan sumber data ditukar.
- Ketika menyimpan, borang berkenaan dilumpuhkan untuk mengelakkan klik berganda. Ralat simpanan dipaparkan pada borang dan draf dikekalkan untuk cubaan semula.
- Jika sesi guru tamat, dialog login semula dibuka dan tindakan disambung selepas login berjaya. Draf penilaian dikekalkan. Ralat rangkaian tidak mengulang simpanan secara automatik.

## Fail untuk dipasang

**GitHub Pages:** ekstrak `PDPR-SK-Taman-Daya-GitHub-Pages-Semakan-Pantas.zip`, gantikan fail laman di repositori dan commit. Pastikan `app.js`, `data.js` dan `style.css` dikemas kini bersama `index.html`. Tunggu deployment Pages selesai, kemudian muat semula penuh laman.

**Portal yang dihoskan melalui Apps Script:** gunakan `Index.html` terkini sebagai kandungan fail HTML `Index`, kemudian deploy versi baharu.

Kemas kini paparan semakan pantas menggunakan tindakan backend yang sedia ada. Jika pembetulan sesi guru daripada kemas kini terdahulu sudah dipasang, tiada perubahan backend tambahan diperlukan. Jika ralat “Nama murid dan kelas tidak sepadan …” masih berlaku, pasang `Code-Semakan-Guru.gs` mengikut `PANDUAN-SEMAKAN.md`.

## Pengesahan tempatan

- 16 semakan logik meliputi 2,054 rekod simulasi, had halaman, carian, status semakan, tapisan tugasan, draf, markah sifar, pengesahan nilai dan pemilihan murid seterusnya.
- 12 semakan pemulihan sesi guru kekal lulus.
- Ujian pelayar menggunakan 26 rekod rekaan: 12 kad dan tiada permintaan gambar pada senarai awal; draf kekal merentas halaman; penilaian disimpan selepas login semula; gambar dibuka atas permintaan; pertukaran gambar tidak mengulangi permintaan backend; simpan dan seterusnya membuka murid berikutnya; rekod tanpa gambar tidak meminta gambar; pembesaran berfungsi.

Tiada rekod Google Sheet, gambar Drive atau deployment Google sebenar diubah semasa ujian ini. Screenshot yang dibekalkan menggunakan data ujian berlabel.
