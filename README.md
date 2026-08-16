# Indonesia MapLibre Analytics & Demographics

Aplikasi WebGIS interaktif berbasis **ASP.NET Core (.NET 8 MVC)**, **MapLibre GL JS**, dan **PostgreSQL / PostGIS** dengan **Martin Tile Server** untuk analisis data kependudukan dan visualisasi peta tematik (*Choropleth*) di Indonesia[cite: 1].

---

## Prasyarat Sistem

Pastikan perangkat sudah terpasang:
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [PostgreSQL](https://www.postgresql.org/download/) dengan ekstensi **PostGIS**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (untuk menjalankan Martin Tile Server via Docker Compose)[cite: 1]
- Tool Database (DBeaver / pgAdmin)

---

## Panduan Setup & Menjalankan Proyek

### 1. Setup Database (PostgreSQL / PostGIS)
1. Buka DBeaver atau pgAdmin, lalu buat database baru dengan nama `indonesia_map`.
2. Buka **SQL Editor** pada database tersebut, lalu aktifkan ekstensi PostGIS terlebih dahulu:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;

```

3. Import / Restore file dump `.sql` yang telah disediakan ke dalam database `indonesia_map` (melalui **DBeaver Tools -> Restore** atau jalankan script `.sql` via SQL Editor).

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
> 
> 

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

```

