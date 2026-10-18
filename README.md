# report-analyzer
Aplikasi web sederhana untuk membantu staf menganalisis laporan operasional yang masih berupa teks. Pengguna menempelkan laporan harian atau laporan shift (data produksi, kendala mesin, jumlah reject, aktivitas harian), lalu AI mengubahnya menjadi ringkasan dan insight yang terstruktur.

## Page

|                          |                          |
:-------------------------:|:-------------------------:
<img width="1150" height="618" alt="image" src="https://github.com/user-attachments/assets/08cc9f02-2825-493a-96cf-1ab26658f1c9" /> | <img width="1164" height="610" alt="image" src="https://github.com/user-attachments/assets/0a1b52b5-0a7b-4e8d-a9a2-38355693d02d" />
<img width="1166" height="610" alt="image" src="https://github.com/user-attachments/assets/7da4f46b-d1ed-48ab-ab22-1a4ffb276ff6" /> | <img width="1157" height="694" alt="image" src="https://github.com/user-attachments/assets/3980cece-5a5b-4089-8773-e8216df2f5a6" />


## Contoh
 
**Input**
 
```text
Produksi hari ini mencapai 350 unit. Terdapat 12 produk reject.
Mesin A mengalami downtime selama 45 menit karena masalah pada komponen mesin.
```
 
**Output**
 
```text
Ringkasan      : Produksi 350 unit dengan 12 produk reject, Mesin A downtime 45 menit.
Kendala utama  : - Mesin A downtime 45 menit karena masalah komponen mesin
Reject rate    : 3,43%
Tindak lanjut  : - Periksa komponen Mesin A
                 - Pantau reject rate
```
 
## Fitur
 
- **Input laporan**: tempel laporan berbentuk teks bebas, atau pilih dari lima contoh laporan bawaan.
- **Analisis AI**: laporan dianalisis oleh model di Groq API.
- **Hasil terstruktur**: angka penting (produksi, reject, reject rate, downtime), ringkasan, kendala utama, dan tindak lanjut.
- **Salin dan ekspor**: salin hasil ke clipboard, atau unduh sebagai `.txt` dan `.json`.
Tambahan:
 
- **Dua bahasa (Indonesia / English)**: seluruh tampilan dan hasil analisis ikut berganti bahasa.
- **Tema terang dan gelap**: mengikuti pengaturan perangkat pada kunjungan pertama, lalu mengingat pilihan pengguna.
- **Indikator status Groq**: menampilkan apakah Groq API online, model yang dipakai, dan waktu respons, dicek langsung ke Groq setiap 30 detik.
## Teknologi
 
| Bagian | Teknologi |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS 3, TypeScript |
| Backend | Node.js 18+, Express 4, TypeScript |
| AI | [Groq API](https://console.groq.com) (model default `openai/gpt-oss-120b`) |
 
## Cara kerja
 
1. Pengguna menempelkan laporan di frontend.
2. Frontend memanggil `POST /api/analyze` di backend.
3. Backend meminta Groq mengekstrak ringkasan, kendala, angka, dan tindak lanjut dalam format JSON.
4. **Reject rate dihitung di backend** (`reject ÷ produksi × 100`), bukan oleh AI, supaya angkanya akurat. Rumus ini menganggap produk reject sudah termasuk dalam total produksi.
5. Hasil ditampilkan secara terstruktur dan bisa disalin atau diunduh.
AI hanya diminta memakai fakta yang ada di laporan. Angka yang tidak disebutkan ditampilkan sebagai `–`, bukan ditebak.
 
## Struktur proyek
 
```text
.
├── backend/
│   ├── server.ts            # Server Express + integrasi Groq
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx         # Halaman utama
    │   ├── layout.tsx       # Layout, font, dan skrip tema
    │   ├── types.ts         # Tipe data bersama
    │   ├── css.d.ts
    │   └── globals.css      # Variabel warna tema terang/gelap
    ├── public/              # Ikon tab (favicon)
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── .env.local.example
```

