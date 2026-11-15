# Nyeduh Yuk!

Klon personal [brewlogic.app](https://www.brewlogic.app) — tanpa login, tanpa backend, tanpa langganan. By Irse.

Engine hybrid: **rule-based lokal** (deterministik, offline) + **Gemini AI opsional** (pakai API key sendiri).

## Menjalankan

Buka langsung `personal-brew-app/index.html` di browser. Tidak perlu build step, tidak perlu server.

Untuk GitHub Pages: aktifkan Pages pada branch `main`, root `/`, lalu buka
`https://<user>.github.io/<repo>/personal-brew-app/`.

## Fitur

| Fitur | Detail |
|---|---|
| Database 1:1 | 7 processing · 13 varietas · 3 roast · 25 dripper · 43 grinder · 6 air · 4 profil · 2 mode |
| Engine lokal | Deterministik — input sama, output sama, tanpa internet |
| Gemini opsional | Multi key × multi model, failover otomatis, badge menampilkan model yang dipakai |
| Konstanta hardware | Timemore C5 ESP Pro: notasi R.N.T + total klik (klik = R×50 + N×5 + T) |
| History | 30 entri terakhir di `localStorage` |
| Tanpa tracking | Tidak ada analytics, tidak ada request selain ke Gemini saat AI dipakai |

## Struktur

```
personal-brew-app/
├── index.html   # UI (Tailwind CDN, tema #050505 / #D4F932)
├── app.js       # database + engine rule-based + render + history
├── gemini.js    # prompt, failover key × model, parser JSON
└── keys.js      # penyimpanan key terenkripsi (XOR + base64)
```

## API key

Key disimpan di `localStorage` sebagai ciphertext. Isi lewat tombol **Settings AI** → `+ ADD` → `SIMPAN`.
Tanpa key, semua resep dibuat engine lokal dan tetap bisa dipakai.

### Peringatan keamanan

`keys.js` berisi ciphertext key yang di-embed supaya repo bisa dipakai tanpa setup.
Salt-nya ikut ada di file yang sama, jadi ini **obfuscation, bukan enkripsi yang aman** —
siapa pun yang membuka repo bisa mendekripsi key tersebut dan memakai kuota Anda.

Sebelum repo dibuat **publik**:

1. Kosongkan array `EMBEDDED_KEYS_CIPHER` di `keys.js`, atau
2. Jadikan repo **private**.

Cara paling aman: jangan pernah embed key — cukup masukkan lewat panel Settings di browser masing-masing.

## Lisensi

Data parameter berasal dari brewlogic.app dan dipakai untuk keperluan pribadi/pembelajaran.
Kode aplikasi ini bebas dipakai ulang.
