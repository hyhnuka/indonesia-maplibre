// Central State untuk Menyimpan Filter
const filterState = {
    city: 'all',
    metric: 'total_penduduk', // total_penduduk, pria, atau wanita
    opacity: 0.7
};

// Global Variable untuk menyimpan GeoJSON utuh (dipakai untuk BBox Zoom Presisi)
let rawGeojsonData = null;

// 1. FUNGSI DINAMIS: Mengambil Daftar Kota Unik dari GeoJSON
async function populateCityDropdown() {
    try {
        const response = await fetch('/data/map.geojson');
        if (!response.ok) return;
        rawGeojsonData = await response.json();

        // Ambil semua nama kota/kabupaten unik & buang nilai kosong
        const citiesSet = new Set();
        rawGeojsonData.features.forEach(f => {
            const props = f.properties || {};
            const cityName = props.regency || props.kabupaten || props.kota;
            if (cityName && cityName.trim() !== '') {
                citiesSet.add(cityName.trim());
            }
        });

        // Urutkan nama kota sesuai abjad (A-Z)
        const sortedCities = Array.from(citiesSet).sort();

        // Masukkan ke dalam elemen <select id="filter-city">
        const citySelect = document.getElementById('filter-city');
        if (citySelect) {
            citySelect.innerHTML = '<option value="all">Semua Wilayah</option>';

            sortedCities.forEach(cityName => {
                const option = document.createElement('option');
                option.value = cityName;
                option.textContent = cityName;
                citySelect.appendChild(option);
            });
            console.log(`✅ Berhasil memuat ${sortedCities.length} kota ke dropdown filter.`);
        }
    } catch (err) {
        console.error("Gagal mengisi dropdown kota secara dinamis:", err);
    }
}

// 2. FUNGSI UTAMA: Menerapkan Filter Tampilan & Visualisasi
function applyFilters() {
    if (!map || !map.isStyleLoaded()) return;

    const polygonLayer = map.getLayer('polygon-base') ? 'polygon-base' : null;
    const activePolygonLayer = map.getLayer('polygon-active') ? 'polygon-active' : null;

    if (!polygonLayer) return;

    // Filter Wilayah
    if (filterState.city !== 'all') {
        // Cocokkan properti regency/kabupaten/kota
        const cityFilter = ['==', ['get', 'regency'], filterState.city];

        map.setFilter(polygonLayer, cityFilter);

        if (map.getLayer('titik-kecamatan')) {
            map.setFilter('titik-kecamatan', cityFilter);
            map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
        }

        if (map.getLayer('titik-kota')) {
            map.setLayoutProperty('titik-kota', 'visibility', 'none');
        }

        if (typeof districtMarkers !== 'undefined') {
            districtMarkers.forEach(item => {
                item.element.style.display = (item.regency === filterState.city) ? 'block' : 'none';
            });
        }
        if (typeof cityMarkers !== 'undefined') {
            cityMarkers.forEach(m => m.getElement().style.display = 'none');
        }

    } else {
        // Reset jika memilih "Semua Wilayah"
        map.setFilter(polygonLayer, null);

        if (map.getLayer('titik-kecamatan')) {
            map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');
        }
        if (map.getLayer('titik-kota')) {
            map.setLayoutProperty('titik-kota', 'visibility', 'visible');
        }

        if (typeof districtMarkers !== 'undefined') {
            districtMarkers.forEach(item => item.element.style.display = 'none');
        }
        if (typeof cityMarkers !== 'undefined') {
            cityMarkers.forEach(m => m.getElement().style.display = 'block');
        }

        if (activePolygonLayer) {
            map.setFilter(activePolygonLayer, ['==', ['get', 'district'], '']);
        }
    }

    // Update Gradasi Warna (Choropleth)
    updateChoroplethColor(polygonLayer, filterState.metric);
}

// 3. FUNGSI UPDATE GRADASI WARNA DINAMIS
function updateChoroplethColor(layerId, metricKey) {
    if (!map.getLayer(layerId)) return;

    map.setPaintProperty(layerId, 'fill-opacity', filterState.opacity);

    let colorExpression = [];

    if (metricKey === 'pria') {
        colorExpression = [
            'interpolate', ['linear'], ['get', 'pria'],
            0,     '#eff3ff',
            12500, '#bdd7e7',
            25000, '#6baed6',
            37500, '#3182bd',
            50000, '#08519c'
        ];
    } else if (metricKey === 'wanita') {
        colorExpression = [
            'interpolate', ['linear'], ['get', 'wanita'],
            0,     '#fde0ef',
            12500, '#f1b6da',
            25000, '#de77ae',
            37500, '#c51b7d',
            50000, '#8e0152'
        ];
    } else {
        colorExpression = [
            'interpolate', ['linear'], ['get', 'total_penduduk'],
            0,      '#fee5d9',
            25000,  '#fcae91',
            50000,  '#fb6a4a',
            75000,  '#de2d26',
            100000, '#a50f15'
        ];
    }

    map.setPaintProperty(layerId, 'fill-color', colorExpression);
}

// 4. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {

    // Populasikan Dropdown Kota
    populateCityDropdown();

    // Event Dropdown Pilih Kota
    document.getElementById('filter-city')?.addEventListener('change', (e) => {
        filterState.city = e.target.value;

        if (filterState.city !== 'all' && rawGeojsonData) {
            // 🎯 FIX ZOOM: Ambil seluruh fitur polygon milik kota tersebut dari GeoJSON
            const cityFeatures = rawGeojsonData.features.filter(f => {
                const props = f.properties || {};
                const name = props.regency || props.kabupaten || props.kota;
                return name === filterState.city;
            });

            if (cityFeatures.length > 0) {
                // Hitung Bounding Box PRESISI gabungan seluruh polygon & titik kecamatan kota ini
                const cityCollection = turf.featureCollection(cityFeatures);
                const bbox = turf.bbox(cityCollection);

                // Zoom ke seluruh wilayah kota + titik oren dengan aman
                map.fitBounds(bbox, {
                    padding: { top: 90, bottom: 90, left: 90, right: 380 }, // Ruang kanan untuk panel filter
                    maxZoom: 11, // Batas zoom aman agar tidak terlalu dekat
                    duration: 1300
                });
            }
        } else {
            // Reset Zoom ke Indonesia jika pilih "Semua Wilayah"
            map.flyTo({ center: [118.0, -2.5], zoom: 5, duration: 1300 });
        }

        applyFilters();
    });

    // Event Dropdown Metrik Data
    document.getElementById('filter-metric')?.addEventListener('change', (e) => {
        filterState.metric = e.target.value;
        applyFilters();
    });

    // Event Slider Transparansi Area
    document.getElementById('filter-opacity')?.addEventListener('input', (e) => {
        filterState.opacity = parseFloat(e.target.value);
        if (map.getLayer('polygon-base')) {
            map.setPaintProperty('polygon-base', 'fill-opacity', filterState.opacity);
        }
    });
});

// Jalankan filter otomatis setelah peta selesai di-load
if (typeof map !== 'undefined') {
    map.on('load', () => {
        setTimeout(() => {
            applyFilters();
        }, 600);
    });
}