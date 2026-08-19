### 1. `README.md` (Copy-Paste langsung)

# Indonesia MapLibre Analytics & Demographics

Aplikasi WebGIS interaktif berbasis **ASP.NET Core (.NET 8 MVC)**, **MapLibre GL JS**, dan **PostgreSQL / PostGIS** dengan **Martin Tile Server** untuk analisis data kependudukan dan visualisasi peta tematik (*Choropleth*) di Indonesia.

---

## 🚀 Fitur Utama Dashboard
* **Peta Interaktif WebGIS**: Navigasi data spasial kecamatan dan kota seluruh Indonesia.
* **Choropleth Map**: Visualisasi klasifikasi data kependudukan dinamis (*Natural Breaks / Jenks*) per kota.
* **Multi-Parameter Filtering**: Filter data berdasarkan Kategori, Total Penduduk, Gender, dan Kelompok Rentang Usia.
* **Dynamic Insight Panel**: Analisis metrik kependudukan dan visualisasi piramida penduduk per kecamatan.

---

## 🛠️ Tech Stack & Arsitektur
* **Backend:** ASP.NET Core 8.0 (C# / MVC) - Mengatur logika routing, koneksi database, dan penyediaan API/Endpoint data statistik.
* **Frontend:** MapLibre GL JS, HTML5, CSS3, JavaScript - Merender peta interaktif berbasis WebGL dan *Vector Tiles*.
* **Database & Spatial:** PostgreSQL dengan ekstensi PostGIS untuk mengelola data geospasial wilayah Indonesia.
* **Tile Server:** Martin (dijalankan via Docker) - Berperan sebagai jembatan yang menyajikan *Vector Tiles* secara cepat langsung dari database PostGIS ke MapLibre.
* **Containerization:** Docker & Docker Compose - Membungkus layanan database dan tile server agar mudah dijalankan secara instan.

---

## 📂 Alur Kerja Proyek (Workflow)
1. **Infrastruktur (Docker):** Kontainer Docker menjalankan PostgreSQL/PostGIS dan Martin Tile Server secara bersamaan di latar belakang.
2. **Penyajian Peta (Tile Server):** Martin mengambil data geometri spasial dari database PostGIS dan mengubahnya menjadi *vector tiles*.
3. **Rendering Frontend (MapLibre):** Klien (browser) meminta *vector tiles* tersebut melalui Martin, lalu MapLibre merendernya menjadi peta interaktif.
4. **Logika Bisnis & Analisis (ASP.NET Core):** Pengguna berinteraksi dengan panel filter (demografi, gender, usia), di mana ASP.NET Core memproses permintaan tersebut, mengambil data statistik dari database, dan memperbarui visualisasi peta secara dinamis.

