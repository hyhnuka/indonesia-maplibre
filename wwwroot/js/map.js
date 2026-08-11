
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

    // 1. Polygon Dasar
    map.addLayer({
        'id': 'polygon-base',
        'type': 'fill',
        'source': 'map-kecamatan',
        'source-layer': 'indonesia_map',
        'paint': {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.1,
            'fill-outline-color': '#2563eb'
        }
    });

    // 2. Polygon Aktif (Highlight)
    map.addLayer({
        'id': 'polygon-active',
        'type': 'fill',
        'source': 'map-kecamatan',
        'source-layer': 'indonesia_map',
        'paint': {
            'fill-color': '#2563eb',
            'fill-opacity': 0.45,
            'fill-outline-color': '#1d4ed8'
        },
        'filter': ['==', ['get', 'district'], '___NO_SELECTION___']
    });

    // 3. TITIK KECAMATAN (CIRCLE ORANYE)
    map.addLayer({
        'id': 'titik-kecamatan',
        'type': 'circle',
        'source': 'centroid-kecamatan',
        'source-layer': 'district_centroid_view',
        'layout': {
            'visibility': 'none'
        },
        'paint': {
            'circle-radius': 3,
            'circle-color': '#f97316',
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

    // =========================================================================
    // 4. EVENT RE-FILTER SAAT TILE SELESAI DI-LOAD DARI SERVER
    // =========================================================================
    map.on('sourcedata', (e) => {
        if (e.sourceId === 'centroid-kecamatan' && e.isSourceLoaded) {
            if (typeof applyFilters === 'function') {
                applyFilters();
            }
        }
    });

    // =========================================================================
    // 5. INTERAKSI KLIK PETA
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
    };

    map.on('click', 'polygon-base', handleDistrictClick);
    map.on('click', 'titik-kecamatan', handleDistrictClick);

    // =========================================================================
    // DETEKTOR ZOOM MOUSE: DYNAMIC FILTER RESET SAAT ZOOM OUT
    // =========================================================================
    map.on('zoomend', () => {
        const currentZoom = map.getZoom();

        // 1. Jika Zoom Out ke Tampilan Nasional / Pulau (Zoom < 8.5)
        if (currentZoom < 8.5) {
            const citySelect = document.getElementById('filter-city');
            if (citySelect && citySelect.value !== 'all') {
                citySelect.value = 'all';
                citySelect.dispatchEvent(new Event('change')); // Reset total ke Kota/Merah
            }
        }
        // 2. Jika sedang memilih 1 Kecamatan SPESIFIK, tapi user ZOOM OUT (Zoom < 11.5)
        else if (currentZoom < 11.5 && typeof filterState !== 'undefined' && filterState.district !== 'all') {
            const districtSelect = document.getElementById('filter-district');

            if (districtSelect) {
                districtSelect.value = 'all'; // Balikkan dropdown ke 'Semua Kecamatan'
                filterState.district = 'all';  // Reset state

                if (typeof applyFilters === 'function') {
                    applyFilters();            // menampilkan kembali semua titik kecamatan (oren)
                }
                console.log("🔍 Auto-expand titik oranye se-kota karena Zoom Out!");
            }
        }
    });
    // Hover Cursor
    const setCursor = (c) => () => map.getCanvas().style.cursor = c;
    map.on('mouseenter', 'titik-kota', setCursor('pointer'));
    map.on('mouseleave', 'titik-kota', setCursor(''));
    map.on('mouseenter', 'titik-kecamatan', setCursor('pointer'));
    map.on('mouseleave', 'titik-kecamatan', setCursor(''));
    map.on('mouseenter', 'polygon-base', setCursor('pointer'));
    map.on('mouseleave', 'polygon-base', setCursor(''));
});