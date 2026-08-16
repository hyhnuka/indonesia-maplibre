

// =========================================================================
// 1. INISIALISASI PETA MAPLIBRE
// =========================================================================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [118.0, -2.5],
    zoom: 5
});

map.addControl(new maplibregl.NavigationControl());

map.on('load', () => {
    console.log("MapLibre berhasil dimuat. Mengonfigurasi layer PostGIS...");

    // Sembunyikan Label Kota Bawaan Basemap OpenFreeMap
    const allLayers = map.getStyle().layers;
    allLayers.forEach(layer => {
        if (layer.type === 'symbol') {
            const id = layer.id.toLowerCase();
            const isCityOrDistrict = id.includes('city') || id.includes('town') || id.includes('capital') || id.includes('suburb');
            const isKelurahan = id.includes('village') || id.includes('neighbourhood') || id.includes('neighborhood') || id.includes('hamlet');

            if (isCityOrDistrict && !isKelurahan) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        }
    });

    // =========================================================================
    // 2. REGISTER SOURCES
    // =========================================================================
    map.addSource('map-kecamatan', {
        type: 'vector',
        url: 'http://localhost:3000/indonesia_map'
    });

    map.addSource('centroid-kota', {
        type: 'vector',
        url: 'http://localhost:3000/city_centroid_view'
    });

    map.addSource('centroid-kecamatan', {
        type: 'vector',
        url: 'http://localhost:3000/district_centroid_view'
    });

    // =========================================================================
    // 3. REGISTER LAYERS
    // =========================================================================

    // 1. Polygon Dasar (Layer Utama untuk Choropleth)
    map.addLayer({
        'id': 'polygon-base',
        'type': 'fill',
        'source': 'map-kecamatan',
        'source-layer': 'indonesia_map',
        'paint': {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.25,
            'fill-outline-color': '#ffffff'
        }
    });

    // 2. Polygon Aktif (Highlight Seleksi Wilayah)
    map.addLayer({
        'id': 'polygon-active',
        'type': 'line',
        'source': 'map-kecamatan',
        'source-layer': 'indonesia_map',
        'paint': {
            'line-color': '#6366F1',
            'line-width': 2.5,
            'line-opacity': 1
        },
        'filter': ['==', ['get', 'district'], '___NO_SELECTION___']
    });

    // 3. TITIK KECAMATAN (CIRCLE)
    map.addLayer({
        'id': 'titik-kecamatan',
        'type': 'circle',
        'source': 'centroid-kecamatan',
        'source-layer': 'district_centroid_view',
        'layout': {
            'visibility': 'none'
        },
        'paint': {
            'circle-radius': 4,
            'circle-color': '#334155',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        }
    });

    // 4. TITIK KOTA (CIRCLE MERAH)
    map.addLayer({
        'id': 'titik-kota',
        'type': 'circle',
        'source': 'centroid-kota',
        'source-layer': 'city_centroid_view',
        'layout': {
            'visibility': 'visible'
        },
        'paint': {
            'circle-radius': 5,
            'circle-color': '#dc2626',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        }
    });

    map.once('idle', () => {
        if (typeof applyFilters === 'function') {
            applyFilters();
        }
    });

    // =========================================================================
    // 4. INTERAKSI KLIK PETA
    // =========================================================================
    map.on('click', 'titik-kota', (e) => {
        if (!e.features || e.features.length === 0) return;
        const cityName = e.features[0].properties.regency;

        const citySelect = document.getElementById('filter-city');
        if (citySelect) {
            citySelect.value = cityName;
            citySelect.dispatchEvent(new Event('change'));
        }
    });

    const handleDistrictClick = async (e) => {
        if (!e.features || e.features.length === 0) return;

        const props = e.features[0].properties;
        const cityName = props.regency;
        const districtName = props.district;
        const districtId = props.district_id || props.district_code || props.DistrictId;

        if (!cityName || !districtName) return;

        const citySelect = document.getElementById('filter-city');
        const districtSelect = document.getElementById('filter-district');

        if (citySelect && citySelect.value !== cityName) {
            citySelect.value = cityName;
            if (typeof populateDistrictDropdown === 'function') {
                await populateDistrictDropdown(cityName);
            }
        }

        if (districtSelect) {
            districtSelect.value = districtName;
        }

        if (typeof filterState !== 'undefined') {
            filterState.city = cityName;
            filterState.district = districtName;
        }

        if (typeof applyFilters === 'function') {
            applyFilters();
        }

        if (e.lngLat) {
            map.flyTo({ center: e.lngLat, zoom: 12, duration: 1200 });
        }

        if (districtId) {
            try {
                const sidebarRight = document.getElementById('sidebar-right');
                const btnInsight = document.getElementById('nav-btn-insight');
                if (sidebarRight && sidebarRight.classList.contains('collapsed')) {
                    sidebarRight.classList.remove('collapsed');
                    if (btnInsight) btnInsight.classList.add('active');
                    map.resize();
                }

                console.log(`Fetching data detail insight untuk District ID: ${districtId}`);

                const response = await fetch(`/api/demographics/detail/${districtId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (typeof updateInsightPanel === 'function') {
                        updateInsightPanel(data);
                    }
                } else {
                    console.warn(`Gagal mengambil detail insight. Status HTTP: ${response.status}`);
                }
            } catch (err) {
                console.error("Error Fetching Insight:", err);
            }
        }
    };

    map.on('click', 'polygon-base', handleDistrictClick);
    map.on('click', 'titik-kecamatan', handleDistrictClick);

    map.on('zoomend', () => {
        if (typeof isProgrammaticZoom !== 'undefined' && isProgrammaticZoom) return;

        const currentZoom = map.getZoom();
        if (currentZoom < 7.5) {
            const citySelect = document.getElementById('filter-city');
            if (citySelect && citySelect.value !== 'all') {
                citySelect.value = 'all';
                citySelect.dispatchEvent(new Event('change'));
            }
        }
    });

    const setCursor = (c) => () => map.getCanvas().style.cursor = c;
    map.on('mouseenter', 'titik-kota', setCursor('pointer'));
    map.on('mouseleave', 'titik-kota', setCursor(''));
    map.on('mouseenter', 'titik-kecamatan', setCursor('pointer'));
    map.on('mouseleave', 'titik-kecamatan', setCursor(''));
    map.on('mouseenter', 'polygon-base', setCursor('pointer'));
    map.on('mouseleave', 'polygon-base', setCursor(''));
});

// =========================================================================
// HELPER: ALGORITMA JENKS NATURAL BREAKS (3 KELAS)
// =========================================================================
function getVariance(arr) {
    if (!arr || arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
}

function getJenks3Breaks(data) {
    if (!data || data.length === 0) return [0, 0];

    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    if (n <= 3) {
        const b1 = sorted[Math.floor(n / 3)] || sorted[0];
        const b2 = sorted[Math.floor((2 * n) / 3)] || sorted[n - 1];
        return [b1, b2];
    }

    let bestVariance = Infinity;
    let bestBreaks = [sorted[Math.floor(n / 3)], sorted[Math.floor((2 * n) / 3)]];

    for (let i = 1; i < n - 2; i++) {
        for (let j = i + 1; j < n - 1; j++) {
            const g1 = sorted.slice(0, i);
            const g2 = sorted.slice(i, j);
            const g3 = sorted.slice(j);

            const totalVariance = getVariance(g1) + getVariance(g2) + getVariance(g3);

            if (totalVariance < bestVariance) {
                bestVariance = totalVariance;
                bestBreaks = [sorted[i], sorted[j]];
            }
        }
    }

    return bestBreaks;
}

// =========================================================================
// FUNGSI CHOROPLETH COLORING (NATURAL BREAKS / JENKS)
// =========================================================================
async function updateChoroplethLayer(targetProperty = 'none') {
    if (!map || !map.getLayer('polygon-base')) return;

    const selectedCity = typeof filterState !== 'undefined' ? filterState.city : 'all';

    // 1. JIKA PARAMETER 'NONE' ATAU KOTA 'ALL' -> KEMBALIKAN KE WARNA BIRU BASE
    //if (targetProperty === 'none' || selectedCity === 'all') {
    //    map.setPaintProperty('polygon-base', 'fill-color', '#3b82f6');
    //    map.setPaintProperty('polygon-base', 'fill-opacity', 0.25);
    //    resetLegendUI();
    //    return;
    //}
    // 1. JIKA PARAMETER 'NONE' ATAU KOTA 'ALL' -> KEMBALIKAN KE WARNA BIRU BASE
    if (targetProperty === 'none' || selectedCity === 'all') {
        map.setPaintProperty('polygon-base', 'fill-color', '#3b82f6');

        const selectedDistrict = typeof filterState !== 'undefined' ? filterState.district : 'all';

        if (selectedDistrict !== 'all' && selectedCity !== 'all') {
            // Jika memilih 1 kecamatan pada mode warna biru standar
            map.setPaintProperty('polygon-base', 'fill-opacity', [
                'case',
                ['==', ['downcase', ['coalesce', ['get', 'district'], ['get', 'district_name'], '']], selectedDistrict.toLowerCase().trim()],
                0.75,  // Kecamatan aktif: Biru Pekat
                0.12   // Kecamatan lain: Biru Transparan Tipis
            ]);
        } else {
            // Default Nasional / Semua Kecamatan
            map.setPaintProperty('polygon-base', 'fill-opacity', 0.25);
        }

        resetLegendUI();
        return;
    }

    try {
        console.log(`Updating Choropleth (Natural Breaks) untuk kota: ${selectedCity}, Parameter: ${targetProperty}...`);

        const response = await fetch(`/api/demographics/all?regencyName=${encodeURIComponent(selectedCity)}`);
        if (!response.ok) return;

        const dataList = await response.json();
        if (!dataList || dataList.length === 0) {
            resetLegendUI();
            return;
        }

        // 🔑 SAFETY NET: Filter ketat khusus kota aktif
        const activeData = dataList.filter(d => {
            const reg = (d.regency || d.Regency || '').toString().trim().toLowerCase();
            return reg === selectedCity.trim().toLowerCase();
        });

        const targetData = activeData.length > 0 ? activeData : dataList;

        const values = targetData
            .map(d => Number(d[targetProperty] ?? d.totalPopulation ?? d.total_population))
            .filter(v => !isNaN(v) && v >= 0);

        if (values.length === 0) {
            resetLegendUI();
            return;
        }

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const [break1, break2] = getJenks3Breaks(values);

        // 🔑 SUSUN MAP DARI TARGETDATA (Bukan dataList)
        const uniqueDistricts = new Map();

        targetData.forEach(item => {
            const rawName = (item.district || item.District || '').toString().trim().toLowerCase();
            const val = Number(item[targetProperty] ?? item.totalPopulation ?? item.total_population ?? 0);

            if (rawName && !uniqueDistricts.has(rawName)) {
                let color = '#22c55e'; // 🟢 Rendah
                if (val >= break2 && maxVal > minVal) {
                    color = '#ef4444'; // 🔴 Tinggi
                } else if (val >= break1 && maxVal > minVal) {
                    color = '#eab308'; // 🟡 Sedang
                }
                uniqueDistricts.set(rawName, color);
            }
        });

        const matchExpression = [
            'match',
            ['downcase', ['coalesce', ['get', 'district'], ['get', 'district_name'], '']]
        ];

        uniqueDistricts.forEach((color, name) => {
            matchExpression.push(name, color);
        });

        // FALLBACK JADI HIJAU 
        matchExpression.push('#22c55e');

        //map.setPaintProperty('polygon-base', 'fill-color', matchExpression);
        //map.setPaintProperty('polygon-base', 'fill-opacity', 0.75);
        // =====================================================================
        // 6. APPLY PEWARNAAN & DYNAMIC OPACITY (DIMMING EFFECT) KE POLYGON BASE
        // =====================================================================
        map.setPaintProperty('polygon-base', 'fill-color', matchExpression);

        const selectedDistrict = typeof filterState !== 'undefined' ? filterState.district : 'all';

        if (selectedDistrict !== 'all') {
            //  KONDISI 1: ADA 1 KECAMATAN TERPILIH
            // Buat kecamatan yang dipilih pekat (0.85), kecamatan lainnya meredup transparan (0.18)
            map.setPaintProperty('polygon-base', 'fill-opacity', [
                'case',
                ['==', ['downcase', ['coalesce', ['get', 'district'], ['get', 'district_name'], '']], selectedDistrict.toLowerCase().trim()],
                0.85,  // 🌟 Pekat & Menyala untuk kecamatan yang aktif
                0.18   // 🌫️ Meredup transparan untuk kecamatan lain di kota tersebut
            ]);
        } else {
        //  KONDISI 2: "SEMUA KECAMATAN" TERPILIH
        // Semua kecamatan memiliki opacity normal yang merata
            map.setPaintProperty('polygon-base', 'fill-opacity', 0.75);
        }

        updateLegendUI(minVal, break1, break2, maxVal);

        console.log(`Natural Breaks Kota ${selectedCity} Berhasil! (${targetData.length} Kec) | Min: ${minVal}, Mid1: ${break1}, Mid2: ${break2}, Max: ${maxVal}`);

    } catch (err) {
        console.error("Error updateChoroplethLayer:", err);
    }
}

function updateLegendUI(min, break1, break2, max) {
    const format = (num) => new Intl.NumberFormat('id-ID').format(num);

    const elemLow = document.getElementById('legend-range-low');
    const elemMed = document.getElementById('legend-range-medium');
    const elemHigh = document.getElementById('legend-range-high');

    if (elemLow) elemLow.textContent = `${format(min)} - ${format(break1 > min ? break1 - 1 : min)}`;
    if (elemMed) elemMed.textContent = `${format(break1)} - ${format(break2 > break1 ? break2 - 1 : break1)}`;
    if (elemHigh) elemHigh.textContent = `>= ${format(break2)}`;
}

function resetLegendUI() {
    const elemLow = document.getElementById('legend-range-low');
    const elemMed = document.getElementById('legend-range-medium');
    const elemHigh = document.getElementById('legend-range-high');

    if (elemLow) elemLow.textContent = '-';
    if (elemMed) elemMed.textContent = '-';
    if (elemHigh) elemHigh.textContent = '-';
}