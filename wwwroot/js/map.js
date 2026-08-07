// // =========================================================================
// // 1. INISIALISASI PETA
// // =========================================================================
// const map = new maplibregl.Map({
//     container: 'map',
//     style: 'https://tiles.openfreemap.org/styles/bright',
//     center: [118.0, -2.5],
//     zoom: 5
// });

// map.addControl(new maplibregl.NavigationControl());

// let cityMarkers = [];
// let districtMarkers = [];

// map.on('load', () => {
//     // Hide Nama Kota & Kecamatan bawaan Basemap
//     const allLayers = map.getStyle().layers;
//     allLayers.forEach(layer => {
//         if (layer.type === 'symbol') {
//             const id = layer.id.toLowerCase();
//             const isCityOrDistrict = id.includes('city') || id.includes('town') || id.includes('capital') || id.includes('suburb');
//             const isKelurahan = id.includes('village') || id.includes('neighbourhood') || id.includes('neighborhood') || id.includes('hamlet');

//             if (isCityOrDistrict && !isKelurahan) {
//                 map.setLayoutProperty(layer.id, 'visibility', 'none');
//             }
//         }
//     });

//     // =========================================================================
//     // 2. REGISTER SOURCES (DARI MARTIN VECTOR TILES)
//     // =========================================================================

//     // Source Polygon Kecamatan
//     map.addSource('map-kecamatan', {
//         type: 'vector',
//         tiles: ['http://localhost:3000/indonesia_map/{z}/{x}/{y}']
//     });

//     // Source Titik Kota (Merah)
//     map.addSource('centroid-kota', {
//         type: 'vector',
//         tiles: ['http://localhost:3000/city_centroids/{z}/{x}/{y}']
//     });

//     // Source Titik Kecamatan (Oranye)
//     map.addSource('centroid-kecamatan', {
//         type: 'vector',
//         tiles: ['http://localhost:3000/district_centroids/{z}/{x}/{y}']
//     });

//     // =========================================================================
//     // 3. REGISTER LAYERS
//     // =========================================================================

//     // Polygon Dasar (Vector Tile Martin)
//     map.addLayer({
//         'id': 'polygon-base',
//         'type': 'fill',
//         'source': 'map-kecamatan',
//         'source-layer': 'indonesia_map',
//         'paint': {
//             'fill-color': '#cbd5e1',
//             'fill-opacity': 0.2,
//             'fill-outline-color': '#64748b'
//         }
//     });

//     // Polygon Aktif / Selection
//     map.addLayer({
//         'id': 'polygon-active',
//         'type': 'fill',
//         'source': 'map-kecamatan',
//         'source-layer': 'indonesia_map',
//         'paint': {
//             'fill-color': '#2563eb',
//             'fill-opacity': 0.65,
//             'fill-outline-color': '#1d4ed8'
//         },
//         'filter': ['==', ['get', 'district'], '']
//     });

//     // Titik Kecamatan (Orange)
//     map.addLayer({
//         'id': 'titik-kecamatan',
//         'type': 'circle',
//         'source': 'centroid-kecamatan',
//         'source-layer': 'district_centroids',
//         'layout': { 'visibility': 'none' },
//         'paint': {
//             'circle-radius': 8,
//             'circle-color': '#ff6b00',
//             'circle-stroke-width': 2,
//             'circle-stroke-color': '#ffffff'
//         }
//     });

//     // Titik Kota (Merah)
//     map.addLayer({
//         'id': 'titik-kota',
//         'type': 'circle',
//         'source': 'centroid-kota',
//         'source-layer': 'city_centroids',
//         'paint': {
//             'circle-radius': 11,
//             'circle-color': '#ef4444',
//             'circle-stroke-width': 2,
//             'circle-stroke-color': '#ffffff'
//         }
//     });

//     // =========================================================================
//     // 4. GENERATE HTML MARKERS UNTUK LABEL
//     // =========================================================================

//     // Fungsi pembantu untuk membuat HTML Marker dari query tile yang ter-load
//     const setupLabels = () => {
//         // Render Label Kota
//         const cities = map.queryRenderedFeatures({ layers: ['titik-kota'] });
//         const addedCities = new Set();

//         cities.forEach(f => {
//             const cityName = f.properties.regency;
//             if (cityName && !addedCities.has(cityName)) {
//                 addedCities.add(cityName);

//                 const el = document.createElement('div');
//                 el.className = 'marker-label-kota';
//                 el.innerText = cityName;
//                 el.style.cssText = `
//                     color: #dc2626;
//                     font-weight: bold;
//                     font-size: 13px;
//                     font-family: sans-serif;
//                     background: rgba(255, 255, 255, 0.9);
//                     padding: 2px 6px;
//                     border-radius: 4px;
//                     border: 1px solid #fca5a5;
//                     box-shadow: 0 2px 4px rgba(0,0,0,0.15);
//                     pointer-events: none;
//                     white-space: nowrap;
//                 `;

//                 const marker = new maplibregl.Marker({ element: el, offset: [0, 22] })
//                     .setLngLat(f.geometry.coordinates)
//                     .addTo(map);

//                 marker.getElement().style.pointerEvents = 'none';
//                 cityMarkers.push(marker);
//             }
//         });
//     };

//     map.once('idle', setupLabels);

//     // =========================================================================
//     // 5. INTERAKSI & DRILL-DOWN
//     // =========================================================================

//     // Klik Titik Kota (Merah)
//     map.on('click', 'titik-kota', (e) => {
//         if (e.originalEvent) {
//             e.originalEvent.cancelBubble = true;
//         }

//         if (!e.features || e.features.length === 0) return;
//         const cityName = e.features[0].properties.regency;
//         const clickCoords = e.lngLat;
//         console.log("Klik Titik Kota:", cityName);

//         // Highlight SELURUH POLYGON KECAMATAN yang ada di kota ini di layer polygon-active
//         map.setFilter('polygon-active', ['==', ['get', 'regency'], cityName]);

//         // 1. Filter layer titik kecamatan agar hanya menampilkan kecamatan di kota ini
//         map.setFilter('titik-kecamatan', ['==', ['get', 'regency'], cityName]);

//         // 2. Sembunyikan titik & label Kota
//         map.setLayoutProperty('titik-kota', 'visibility', 'none');
//         cityMarkers.forEach(m => m.getElement().style.display = 'none');

//         // 3. Tampilkan titik Kecamatan khusus kota ini
//         map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');

//         // 4. Zoom ke lokasi Kota
//         map.flyTo({
//             center: clickCoords,
//             zoom: 10,
//             duration: 1300
//         });
//     });

//     // Klik Kecamatan / Polygon
//     const handleDistrictClick = (e) => {
//         if (!e.features || e.features.length === 0) return;
//         const props = e.features[0].properties;
//         const districtName = props.district;

//         if (!districtName) return;

//         map.setFilter('polygon-active', ['==', ['get', 'district'], districtName]);

//         if (e.lngLat) {
//             map.flyTo({
//                 center: e.lngLat,
//                 zoom: 12,
//                 duration: 1200
//             });
//         }
//     };

//     map.on('click', 'titik-kecamatan', handleDistrictClick);
//     map.on('click', 'polygon-base', handleDistrictClick);

//     // Reset ke Level Kota saat Zoom Out
//     map.on('zoomend', () => {
//         if (map.getZoom() < 8.5) {
//             map.setFilter('polygon-active', ['==', ['get', 'district'], '']);
//             map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');

//             map.setLayoutProperty('titik-kota', 'visibility', 'visible');
//             cityMarkers.forEach(m => m.getElement().style.display = 'block');
//         }
//     });

//     // Cursor Pointer
//     const setCursor = (c) => () => map.getCanvas().style.cursor = c;
//     map.on('mouseenter', 'titik-kota', setCursor('pointer'));
//     map.on('mouseleave', 'titik-kota', setCursor(''));
//     map.on('mouseenter', 'titik-kecamatan', setCursor('pointer'));
//     map.on('mouseleave', 'titik-kecamatan', setCursor(''));
// });


// =========================================================================
// 1. INISIALISASI PETA
// =========================================================================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [118.0, -2.5],
    zoom: 5
});

map.addControl(new maplibregl.NavigationControl());

map.on('load', () => {
    // Hide Nama Kota & Kecamatan bawaan Basemap OpenFreeMap
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

    // Filter khusus: HANYA ambil polygon kecamatan (district_id > 4 digit)
    const districtOnlyFilter = ['>', ['length', ['to-string', ['get', 'district_id']]], 4];

    // =========================================================================
    // 2. REGISTER SOURCES (DARI MARTIN VECTOR TILES)
    // =========================================================================

    map.addSource('map-kecamatan', {
        type: 'vector',
        tiles: ['http://localhost:3000/indonesia_map/{z}/{x}/{y}']
    });

    map.addSource('centroid-kota', {
        type: 'vector',
        tiles: ['http://localhost:3000/city_centroids/{z}/{x}/{y}']
    });

    map.addSource('centroid-kecamatan', {
        type: 'vector',
        tiles: ['http://localhost:3000/district_centroids/{z}/{x}/{y}']
    });

    // =========================================================================
    // 3. REGISTER LAYERS
    // =========================================================================

    // Polygon Dasar (Sangat transparan agar basemap terlihat)
    map.addLayer({
        'id': 'polygon-base',
        'type': 'fill',
        'source': 'map-kecamatan',
        'source-layer': 'indonesia_map',
        'paint': {
            'fill-color': '#000000',
            'fill-opacity': 0.05, // Hanya 5% opacity
            'fill-outline-color': '#64748b'
        }
    });

    // Polygon Aktif saat diklik (Biru Transparan)
    map.addLayer({
        'id': 'polygon-active',
        'type': 'fill',
        'source': 'map-kecamatan',
        'source-layer': 'indonesia_map',
        'paint': {
            'fill-color': '#2563eb',
            'fill-opacity': 0.35, // Biru transparan elegan
            'fill-outline-color': '#1d4ed8'
        },
        'filter': ['==', ['get', 'district'], '___NO_SELECTION___']
    });

    // 3. Titik Kecamatan (Circle Oranye)
    map.addLayer({
        'id': 'titik-kecamatan',
        'type': 'circle',
        'source': 'centroid-kecamatan',
        'source-layer': 'district_centroids',
        'layout': {
            'visibility': 'none'
        },
        'paint': {
            'circle-radius': 7,
            'circle-color': '#ff6b00',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // 4. Label Nama Kecamatan (PASTI MUNCUL KETIKA KOTA DIKLIK)
    map.addLayer({
        'id': 'label-kecamatan',
        'type': 'symbol',
        'source': 'centroid-kecamatan',
        'source-layer': 'district_centroids',
        'layout': {
            'visibility': 'none',
            'text-field': ['get', 'district'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-allow-overlap': true,      // Paksa tampilkan tanpa disembunyikan MapLibre
            'text-ignore-placement': true
        },
        'paint': {
            'text-color': '#c2410c',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
        }
    });

    // 5. Titik Kota (Circle Merah - LANGSUNG TAMPIL DIAWAL)
    map.addLayer({
        'id': 'titik-kota',
        'type': 'circle',
        'source': 'centroid-kota',
        'source-layer': 'city_centroids',
        'layout': {
            'visibility': 'visible'
        },
        'paint': {
            'circle-radius': 9,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // 6. Label Nama Kota (LANGSUNG TAMPIL DIAWAL)
    map.addLayer({
        'id': 'label-kota',
        'type': 'symbol',
        'source': 'centroid-kota',
        'source-layer': 'city_centroids',
        'layout': {
            'visibility': 'visible',
            'text-field': ['get', 'regency'],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-allow-overlap': true,      // Paksa tampilkan tanpa disembunyikan MapLibre
            'text-ignore-placement': true
        },
        'paint': {
            'text-color': '#dc2626',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
        }
    });

    // =========================================================================
    // 4. INTERAKSI & DRILL-DOWN
    // =========================================================================

    // Klik Titik Kota (Merah)
    map.on('click', 'titik-kota', (e) => {
        if (e.originalEvent) {
            e.originalEvent.cancelBubble = true;
        }

        if (!e.features || e.features.length === 0) return;
        const cityName = e.features[0].properties.regency;
        const clickCoords = e.lngLat;

        console.log("Klik Titik Kota:", cityName);

        // Highlight HANYA polygon kecamatan di kota ini
        map.setFilter('polygon-active', ['all', districtOnlyFilter, ['==', ['get', 'regency'], cityName]]);

        // Filter titik & label kecamatan
        map.setFilter('titik-kecamatan', ['==', ['get', 'regency'], cityName]);
        map.setFilter('label-kecamatan', ['==', ['get', 'regency'], cityName]);

        // Sembunyikan titik/label Kota
        map.setLayoutProperty('titik-kota', 'visibility', 'none');
        map.setLayoutProperty('label-kota', 'visibility', 'none');

        // Tampilkan titik ORANYE & NAMA KECAMATAN
        map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
        map.setLayoutProperty('label-kecamatan', 'visibility', 'visible');

        map.flyTo({ center: clickCoords, zoom: 10, duration: 1300 });
    });

    // Klik Kecamatan / Polygon
    const handleDistrictClick = (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        const districtName = props.district;

        if (!districtName) return;

        map.setFilter('polygon-active', ['all', districtOnlyFilter, ['==', ['get', 'district'], districtName]]);

        if (e.lngLat) {
            map.flyTo({ center: e.lngLat, zoom: 12, duration: 1200 });
        }
    };

    map.on('click', 'titik-kecamatan', handleDistrictClick);
    map.on('click', 'polygon-base', handleDistrictClick);

    // Reset ke Level Kota saat Zoom Out
    map.on('zoomend', () => {
        if (map.getZoom() < 8.5) {
            map.setFilter('polygon-active', ['all', districtOnlyFilter, ['==', ['get', 'district'], '___NO_SELECTION___']]);

            map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');
            map.setLayoutProperty('label-kecamatan', 'visibility', 'none');

            map.setLayoutProperty('titik-kota', 'visibility', 'visible');
            map.setLayoutProperty('label-kota', 'visibility', 'visible');
        }
    });

    // Cursor Pointer
    const setCursor = (c) => () => map.getCanvas().style.cursor = c;
    map.on('mouseenter', 'titik-kota', setCursor('pointer'));
    map.on('mouseleave', 'titik-kota', setCursor(''));
    map.on('mouseenter', 'titik-kecamatan', setCursor('pointer'));
    map.on('mouseleave', 'titik-kecamatan', setCursor(''));
});