import os
import json
import re
import csv

INPUT_FOLDER = "./sidoarjo"
CSV_FILE = "./sidoarjo/sidoarjo.csv"
OUTPUT_FILE = "./map_kota/map_sidoarjo.geojson"

# ==========================================================
# LOAD DATA PENDUDUK DARI CSV
# ==========================================================

population_data = {}

if os.path.exists(CSV_FILE):
    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")

        for row in reader:
            kode = row["Kode Kecamatan"].strip()

            population_data[kode] = {
                "pria": int(row["Laki-Laki"].replace(".", "")),
                "wanita": int(row["Perempuan"].replace(".", "")),
                "total_penduduk": int(row["Jumlah"].replace(".", ""))
            }

    print(f"✅ Data penduduk dimuat: {len(population_data)} kecamatan")

else:
    print(f"⚠️ CSV '{CSV_FILE}' tidak ditemukan")


# ==========================================================
# GEOJSON TEMPLATE
# ==========================================================

merged_geojson = {
    "type": "FeatureCollection",
    "name": "map",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "features": []
}

if not os.path.exists(INPUT_FOLDER):
    print(f"❌ Folder '{INPUT_FOLDER}' tidak ditemukan!")
    exit()

files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith('.geojson') or f.endswith('.json')]
print(f"🔄 Memproses {len(files)} file kecamatan...")

for filename in files:
    filepath = os.path.join(INPUT_FOLDER, filename)
    
    clean_filename = os.path.splitext(filename)[0]
    
    
    # ------------------------------------------------------
    # FORMAT:
    # id3578010_Karang_Pilang
    # atau
    # 3578010_Karang_Pilang
    # ------------------------------------------------------

    match = re.search(r"(?:id)?(\d+)", clean_filename, re.IGNORECASE)

    if match:
        district_id = match.group(1)
    else:
        district_id = None


    # ambil nama daerah setelah kode
    raw_name = re.sub(
        r"^(?:id)?\d+[_\-\s]*",
        "",
        clean_filename,
        flags=re.IGNORECASE
    )

    district_name = (
        raw_name
        .replace("_", " ")
        .replace("-", " ")
        .strip()
        .title()
    )


    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
            
            extracted_geometry = None
            if data.get("type") == "GeometryCollection" and "geometries" in data:
                extracted_geometry = data["geometries"][0]
            elif data.get("type") == "FeatureCollection" and "features" in data:
                extracted_geometry = data["features"][0].get("geometry")
            elif data.get("type") == "Feature":
                extracted_geometry = data.get("geometry")
            elif data.get("type") in ["Polygon", "MultiPolygon"]:
                extracted_geometry = data

            if not extracted_geometry:
                print(f"⚠️ Gagal mengekstrak geometri: {filename}")
                continue

            # --------------------------------------------------
            # AMBIL DATA PENDUDUK BERDASARKAN KODE KECAMATAN
            # --------------------------------------------------

            penduduk = population_data.get(
                district_id,
                {
                    "pria": 0,
                    "wanita": 0,
                    "total_penduduk": 0
                }
            )

            properties = {
                "district_id": district_id,
                "province": "Jawa Timur",
                "regency": "Sidoarjo",
                "district": district_name,
                "pria": penduduk["pria"],
                "wanita": penduduk["wanita"],
                "total_penduduk": penduduk["total_penduduk"]
            }

            feature = {
                "type": "Feature",
                "properties": properties,
                "geometry": extracted_geometry
            }

            merged_geojson["features"].append(feature)
            print(
                f"✅ [{district_id}] {district_name}"
                f"| Penduduk: {penduduk['total_penduduk']:,}"
            )

        except Exception as e:
            print(f"Error pada file {filename}: {e}")

# ------------------------------------------------------------------
# POST-PROCESSING UNTUK MENYAMPINGKAN DATA COORDINATES
# ------------------------------------------------------------------
raw_json = json.dumps(merged_geojson, ensure_ascii=False, indent=2)

# Fungsi untuk membuang newline & spasi berlebih di dalam blok "coordinates": [...]
def collapse_coordinates(match):
    coord_str = match.group(0)
    collapsed = re.sub(r'\s+', ' ', coord_str)
    collapsed = re.sub(r'\[\s+', '[', collapsed)
    collapsed = re.sub(r'\s+\]', ']', collapsed)
    collapsed = re.sub(r',\s*', ', ', collapsed)
    return collapsed

# Cari pattern "coordinates": [ ... ] lalu buat satu baris menyamping
compact_json = re.sub(
    r'"coordinates":\s*\[[\s\S]*?\]\s*\}',
    collapse_coordinates,
    raw_json
)

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(compact_json)

print(f"\nBerhasil! Seluruh isi koordinat disatukan menyamping di '{OUTPUT_FILE}'.")