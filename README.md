# Tugasan PdPR — SK Taman Daya

Portal murid, guru dan rumusan kelas bertema permainan Mario, lengkap dengan lencana sekolah dan bunyi interaktif. Versi ini boleh diterbitkan terus menggunakan GitHub Pages tanpa proses build.

## Cara terbitkan

1. Ekstrak ZIP ini pada komputer.
2. Cipta repositori GitHub, contohnya `pdpr-sk-taman-daya`. Untuk GitHub Free, gunakan repositori **Public** bagi GitHub Pages.
3. Dalam repositori, pilih **Add file → Upload files**. Muat naik **isi** folder yang diekstrak, kemudian **Commit changes**. Jangan muat naik ZIP sahaja. Pastikan `index.html` terletak terus di peringkat utama repositori, bersama `app.js` dan `style.css`; bukan dalam subfolder.
4. Buka **Settings → Pages**.
5. Dalam **Build and deployment**, pilih **Source: Deploy from a branch**.
6. Pilih **Branch: main**, folder **/(root)**, kemudian klik **Save**. Jika nama branch utama berbeza, pilih branch yang mengandungi fail tadi.
7. Tunggu deployment siap. Pada halaman Pages, klik **Visit site** untuk membuka URL sebenar laman anda.

Panduan rasmi: [Konfigurasi sumber GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) dan [Mencipta laman GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Fail yang perlu dimuat naik

- `index.html` — halaman utama. Nama fail mestilah huruf kecil seperti ini.
- `app.js` — fungsi sistem dan bunyi permainan.
- `style.css` — tema dan susun atur responsif.
- `roster.json` — salinan senarai nama untuk fallback dan mod demo.
- `lencana-sk-taman-daya.jpeg` — lencana sekolah.
- `.nojekyll` — melayani fail statik terus.
- `README.md` — panduan ini.

## Sambungan Google Sheet dan gambar Drive

GitHub Pages menyediakan antaramuka. Simpanan dan bacaan data sebenar terus menggunakan Web App Apps Script yang diberikan. URL asal sudah ditetapkan dalam `app.js`. Selepas laman dibuka, gunakan ikon **⚙ Tetapan sambungan** jika anda perlu menukar URL deployment. Tetapan yang diubah melalui pelayar hanya terpakai pada pelayar itu; untuk menukar lalai bagi semua pengguna, kemas kini nilai `DEFAULT_API` dalam `app.js` dan commit semula.

Backend Apps Script perlu menggunakan `Code.gs` sistem ini dan deployment Web App yang membenarkan akses pengguna sasaran. Kod backend tidak termasuk dalam ZIP laman ini; ia disediakan berasingan untuk dipasang dalam editor Apps Script. Fail backend tidak dijalankan oleh GitHub Pages.

Kata laluan guru sebenar ditetapkan dalam **Apps Script → Project Settings → Script Properties → TEACHER_PASSWORD**. Jangan masukkan kata laluan sebenar ke dalam fail laman. Literal kata laluan pada fungsi demo hanya digunakan oleh simulasi demo.

Jika sambungan belum aktif, portal memaparkan status tersebut dan menyediakan **Cuba mod demo**. Rekod demo hanya disimpan pada pelayar, tidak dihantar ke Google Sheet atau Drive.

Jika sekatan CORS atau polisi akaun Google menghalang API pada domain GitHub Pages, semak deployment Apps Script. Fail `Index.html` kendiri yang dibekalkan berasingan boleh digunakan untuk membuka seluruh portal melalui Apps Script dan komunikasi `google.script.run`.

## Mengemas kini laman

Gantikan fail yang berubah di repositori dan commit. GitHub Pages akan menerbitkan perubahan berdasarkan branch yang dipilih. Laluan aset adalah relatif supaya laman turut berfungsi pada URL repositori.
