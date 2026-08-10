1. Install docker desktop
2. Setup docker-compose.yaml
```
version: '3.8'

services:
  ooh_postgis:
    image: postgis/postgis:latest
    container_name: ooh_postgis
    environment:
      POSTGRES_DB: ooh_gis
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgis_data:/var/lib/postgresql/data
    restart: always

  ooh_martin:
    image: maplibre/martin:latest
    container_name: ooh_martin
    environment:
      # Martin otomatis membaca database PostGIS lewat URL ini
      DATABASE_URL: postgresql://postgres:postgres@ooh_postgis:5432/postgres
    ports:
      - "3000:3000"
    depends_on:
      - ooh_postgis
    restart: always

volumes:
  postgis_data:
```
3. Install DBeaver

1) setup db connection
Di DBeaver, klik tombol New Database Connection (ikon colokan 🔌 di pojok kiri atas).Pilih PostgreSQL $\rightarrow$ klik Next.Di tab Main, isi formulir dengan detail berikut:Connect by: HostHost: localhostPort: 5432Database: ooh_gisUsername: postgresPassword: postgres


SETUP DB
-- 1. Pastikan ekstensi PostGIS aktif
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Buat tabel utama untuk menyimpan GeoJSON
CREATE TABLE IF NOT EXISTS indonesia_map (
    id SERIAL PRIMARY KEY,
    district_id VARCHAR(50),
    regency VARCHAR(100),
    district VARCHAR(100),
    pria INT DEFAULT 0,
    wanita INT DEFAULT 0,
    total_penduduk INT DEFAULT 0,
    geom GEOMETRY(Geometry, 4326)
);

-- 3. Buat tabel centroid kecamatan
CREATE TABLE IF NOT EXISTS district_centroid (
    id SERIAL PRIMARY KEY,
    district_id VARCHAR(50),
    regency VARCHAR(100),
    district VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);

-- 4. Buat tabel centroid kota
CREATE TABLE IF NOT EXISTS city_centroid (
    id SERIAL PRIMARY KEY,
    regency VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);