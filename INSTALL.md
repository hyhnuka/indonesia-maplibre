
# Panduan Instalasi & Setup Proyek (Handover Guide)

Dokumen ini memuat langkah-langkah teknis untuk menginisialisasi dan menjalankan proyek **Indonesia MapLibre Analytics & Demographics** di *environment* lokal. 

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
* Pilih **Tools** -> **Execute Script**.
* Masukkan path file `.sql` yang ingin di-restore, lalu jalankan hingga selesai.

---

### 3. Konfigurasi `appsettings.json`

Buka file `appsettings.json` di *root folder* proyek, lalu pastikan koneksi sesuai dengan database lokal:

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

---

### 4. Jalankan Aplikasi Web ASP.NET Core

Buka terminal di *root* direktori proyek, lalu jalankan perintah berikut:

```bash
dotnet run
```

Setelah aplikasi berjalan, buka browser dan akses URL lokal yang tertera pada terminal (biasanya):

* `http://localhost:5140`

---

## 📌 Catatan Penting Terkait Konfigurasi Database (DBeaver & Docker)

* **Nama Database, Username, & Password:** Parameter koneksi di DBeaver, file `appsettings.json`, dan `docker-compose.yaml` **tidak wajib kaku** sama persis seperti di atas. Kamu bebas mengubah nama database, *username*, atau *password*-nya, **asal pastikan** nilai yang ada di DBeaver dan file `appsettings.json` selaras/cocok dengan konfigurasi yang aktif.
