Berikut adalah perbaikan lengkap pada bagian **Prasyarat Sistem** dan **1. Setup Database (PostgreSQL / PostGIS)** agar menggunakan **DBeaver** sesuai dengan instruksi yang kamu inginkan:

---

# Indonesia MapLibre Analytics & Demographics

Aplikasi WebGIS interaktif berbasis **ASP.NET Core (.NET 8 MVC)**, **MapLibre GL JS**, dan **PostgreSQL / PostGIS** dengan **Martin Tile Server** untuk analisis data kependudukan dan visualisasi peta tematik (*Choropleth*) di Indonesia.

---

## Prasyarat Sistem

Pastikan perangkat sudah terpasang:

* [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (untuk menjalankan PostgreSQL/PostGIS dan Martin Tile Server via Docker Compose)
* [DBeaver](https://dbeaver.io/download/) (sebagai aplikasi manajemen dan client database)

---

## Panduan Setup & Menjalankan Proyek

### 1. Setup Database menggunakan DBeaver

1. Buka aplikasi **DBeaver**, lalu buat koneksi baru ke server PostgreSQL lokal.
2. Buat database baru melalui DBeaver dengan klik kanan pada server -> **Create** -> **Database**, lalu beri nama `indonesia_map`.
3. Buka database `indonesia_map`, klik kanan pada bagian **SQL Editor**, lalu pilih **Open SQL Editor**.
4. Salin dan jalankan script berikut untuk mengaktifkan ekstensi PostGIS:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

```

5. Lakukan *restore* file *dump* `.sql` yang telah disediakan ke dalam database `indonesia_map`:
* Klik kanan pada database `indonesia_map` di DBeaver.
* Pilih **Tools** -> **Restore**.
* Masukkan path file `.sql` yang ingin di-restore, lalu ikuti instruksi hingga selesai.



---

### 2. Konfigurasi `appsettings.json`

Buka file `appsettings.json` di root folder proyek, lalu sesuaikan koneksi database lokal kamu (terutama `User Id` dan `Password`):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=indonesia_map;Username=postgres;Password=YOUR_POSTGRES_PASSWORD;"
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

---

### 3. Jalankan Tile Server (Martin via Docker)

Tile server digunakan untuk menyajikan Vector Tiles dari PostGIS ke MapLibre GL. Jalankan perintah berikut di root folder proyek:

```bash
docker compose up -d

```

> Tile server akan berjalan di `http://localhost:3000`.

---

### 4. Jalankan Aplikasi Web ASP.NET Core

Buka terminal di root direktori proyek, lalu jalankan perintah:

```bash
# Restore package dependensi
dotnet restore

# Build proyek
dotnet build

# Jalankan aplikasi
dotnet run

```

Setelah aplikasi berjalan, buka browser dan akses URL yang tertera pada terminal:

* `http://localhost:5140`

---

## Fitur Utama Dashboard

* **Peta Interaktif WebGIS**: Navigasi data spasial kecamatan dan kota seluruh Indonesia.
* **Choropleth Map**: Visualisasi klasifikasi data kependudukan dinamis (*Natural Breaks / Jenks*) per kota.
* **Multi-Parameter Filtering**: Filter data berdasarkan Kategori, Total Penduduk, Gender, dan Kelompok Rentang Usia.
* **Dynamic Insight Panel**: Analisis metrik kependudukan dan visualisasi piramida penduduk per kecamatan.