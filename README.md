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

---

## 📋 Prasyarat Sistem
Pastikan perangkat sudah terpasang:
* [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (atau install via PowerShell: `winget install Docker.DockerDesktop --source winget`)
* [DBeaver](https://dbeaver.io/download/) (sebagai aplikasi manajemen dan client database)

---

## 🛠️ Panduan Setup & Menjalankan Proyek

### 1. Clone Repositori & Jalankan Docker
1. Clone repositori GitHub proyek ini:
```bash
   git clone [https://github.com/hyhnuka/indonesia-maplibre.git](https://github.com/hyhnuka/indonesia-maplibre.git)
```

2. Buka aplikasi **Docker Desktop** dan pastikan status *engine*-nya sudah *running* (hijau).
3. Buka terminal di folder utama proyek, lalu jalankan perintah berikut untuk menyalakan database dan tile server secara instan:
```bash
docker compose up -d
```
### 2. Setup Database Menggunakan DBeaver

1. Buka aplikasi **DBeaver**, lalu buat koneksi baru ke server PostgreSQL lokal.
2. Klik ikon *New Database Connection* → Pilih **PostgreSQL**.
3. Isi parameter koneksi sesuai dengan konfigurasi pada file `docker-compose.yaml`:
* **Host:** `localhost`
* **Port:** `5432`
* **Database:** `ooh_gis`
* **Username:** `postgres`
* **Password:** `postgres`


4. Lakukan *restore* file *dump* `.sql` yang telah disediakan ke dalam database `ooh_gis`:
* Klik kanan pada database `ooh_gis` di DBeaver.
* Pilih **Tools** -> **Execute Script** (atau *Restore*).
* Masukkan path file `.sql` yang ingin di-restore, lalu jalankan hingga selesai.



### 3. Konfigurasi `appsettings.json`

Buka file `appsettings.json` di *root folder* proyek, lalu sesuaikan koneksi database lokal kamu (terutama bagian *User Id* dan *Password*):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=ooh_gis;Username=postgres;Password=postgres;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}

```

### 4. Jalankan Aplikasi Web ASP.NET Core

Buka terminal di *root* direktori proyek, lalu jalankan perintah berikut:

```bash
# Restore package dependensi
dotnet restore

# Build proyek
dotnet build

# Jalankan aplikasi
dotnet run

```

Setelah aplikasi berjalan, buka browser dan akses URL lokal yang tertera pada terminal:

* `http://localhost:5140`

---

## 📌 Catatan Penting Terkait Konfigurasi Database (DBeaver & Docker)

* **Nama Database, Username, & Password:** Parameter koneksi di DBeaver, file `appsettings.json`, dan `docker-compose.yaml` **tidak wajib kaku** harus sama persis. Kamu bebas mengubah nama database, *username*, atau *password*-nya, **asal pastikan** nilai yang ada di DBeaver dan file `appsettings.json` selaras dengan konfigurasi yang aktif.

