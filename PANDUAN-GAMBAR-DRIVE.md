# Pembetulan gambar dan pautan Google Drive

Kemas kini 16 Oktober 2026.

## Mengapa gambar dikatakan tiada

Kod bacaan CSV terdahulu hanya menerima lajur `photos` dalam format JSON seperti `[{"id":"ID_FAIL","name":"Gambar.jpg"}]`. Sheet yang diterbitkan turut menggunakan pautan terus `https://lh3.googleusercontent.com/d/ID_FAIL`. Pautan biasa ini gagal dibaca sebagai JSON lalu senarai lampiran menjadi kosong.

Kod lama juga menyimpan rekod penghantaran baharu dengan metadata gambar kosong sementara menunggu penerbitan CSV. Paparan baharu membezakan metadata yang belum tersedia daripada rekod tanpa lampiran dan mengekalkan lampiran CSV apabila ada.

## Tingkah laku baharu

- Lajur `photos` menerima pautan terus Googleusercontent, pautan Drive `file/d/.../view`, `open?id=...`, `uc?...&id=...`, ID fail, JSON objek dan JSON senarai pautan/metadata. Beberapa pautan boleh dipisahkan dengan baris baharu, ruang atau koma, maksimum empat gambar.
- Kad penghantaran menyediakan **Buka di Google Drive** atau pautan bernombor bagi setiap gambar. Pautan ini tidak memuatkan imej pada senarai.
- Butang **Pratonton** membuka gambar yang dirujuk oleh CSV. Untuk pautan terus, imej dibaca daripada URL gambar tanpa menunggu Apps Script.
- **Buka di Google Drive** disediakan di atas gambar dan boleh diklik serta-merta. Ia kekal tersedia jika pratonton gagal atau lambat.
- Jika gambar belum selesai dimuatkan selepas lapan saat, paparan mengingatkan guru supaya menggunakan pautan Drive. Kegagalan gambar memaparkan mesej yang jelas; ia tidak menandakan lampiran tiada.
- Metadata yang hanya mempunyai ID fail masih menggunakan butiran Apps Script yang disahkan untuk membaca gambar peribadi, sambil menyediakan pautan Drive lebih awal.
- Senarai utama kekal maksimum 12 kad setiap halaman dan tidak meminta semua gambar serentak.

Pautan Drive menggunakan kebenaran fail sedia ada. Kemas kini ini tidak menukar perkongsian fail, nama murid, rekod atau folder Drive. Jika lajur `photos` benar-benar kosong, sistem menyatakan tiada pautan dalam rekod tersebut.

## Pasang pada GitHub Pages

1. Ekstrak **PDPR-SK-Taman-Daya-GitHub-Pages-Gambar-Drive.zip**.
2. Muat naik isi ZIP untuk menggantikan fail laman dalam repositori. Pastikan `app.js`, **`data.js`**, `style.css` dan `index.html` dikemas kini bersama.
3. Commit perubahan dan tunggu deployment GitHub Pages selesai.
4. Muat semula penuh laman, kemudian klik **Segar semula** supaya CSV dibaca menggunakan pembaca baharu.
5. Buka **Saya guru → Rekod penghantaran**. Pilih rekod yang mempunyai pautan dalam `photos`, kemudian klik **Pratonton** atau **Buka di Google Drive**.

Pembetulan bacaan pautan ini tidak memerlukan lajur tambahan atau perubahan Apps Script. Jika portal dihoskan melalui Apps Script, gantikan fail HTML `Index` dengan kandungan `Index.html` terkini, kemudian deploy versi HTML baharu. Pembetulan pengesahan sesi guru yang terdahulu masih dirujuk dalam `PANDUAN-SEMAKAN.md`.

## Pengesahan

- 21 semakan gambar/Drive: format URL sebenar daripada lajur `photos`, JSON, beberapa pautan, ID fail, resource key, penolakan URL tidak berkaitan, metadata gambar baharu dan cache lama yang mempunyai senarai kosong.
- 28 semakan CSV/cache, 16 semakan logik semakan pantas dan 12 semakan sesi guru kekal lulus.
- Ujian pelayar: senarai 12 kad tanpa imej automatik; pautan Drive segera tersedia; satu URL gambar sebenar daripada Sheet berjaya dipaparkan tanpa panggilan butiran Apps Script; pautan kekal tersedia ketika imej gagal; penilaian dan simpan-ke-murid-seterusnya berfungsi dengan data rekaan; gambar daripada backend yang disahkan masih dipaparkan.

Tiada penulisan pada Google Sheet atau Drive sebenar dan tiada perubahan deployment Google dibuat semasa ujian. Screenshot menggunakan identiti murid ujian dan satu gambar daripada pautan Sheet yang diberikan.
