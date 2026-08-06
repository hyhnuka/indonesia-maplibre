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

let cityMarkers = [];
let districtMarkers = [];

map.on('load', async () => {
    // Hide Nama Kota & Kecamatan bawaan Basemap
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

    try {
        console.log("Memuat data GeoJSON untuk perhitungan centroid...");
        const response = await fetch('/data/map.geojson');
        if (!response.ok) throw new Error("Gagal load map.geojson untuk centroid!");
        const geojsonData = await response.json();

        // =========================================================================
        // 1. HITUNG CENTROID KECAMATAN & KOTA (TURF.JS IMPROVED)
        // =========================================================================
        const districtCentroids = [];
        const cityPolygons = {};

        geojsonData.features.forEach(feature => {
            const props = feature.properties || {};
            const districtId = String(props.district_id || props.id || "");

            // FILTER PENTING:
            // Jika ID panjangnya <= 4 karakter (misal "7371" Kota Makassar), 
            // ini adalah polygon batas KOTA, BUKAN KECAMATAN. Lewati agar tidak double hitung!
            if (districtId.length <= 4 && !props.district) {
                return;
            }

            const cityName = props.regency || props.kabupaten || props.kota || "Lainnya";
            const districtName = props.district || props.kecamatan || "Unknown";

            // --- HITUNG CENTROID KECAMATAN PRESISI ---
            try {
                let targetFeature = feature;

                // Jika MultiPolygon (banyak pulau), ambil polygon dengan AREA TERLUAS (daratan utama)
                if (feature.geometry.type === 'MultiPolygon') {
                    let maxArea = 0;
                    let largestPolygon = null;
                    feature.geometry.coordinates.forEach(coords => {
                        const poly = turf.polygon(coords);
                        const area = turf.area(poly);
                        if (area > maxArea) {
                            maxArea = area;
                            largestPolygon = poly;
                        }
                    });
                    if (largestPolygon) targetFeature = largestPolygon;
                }

                // Gunakan centerOfMass dulu, jika jatuh di luar polygon (misal di laut), gunakan pointOnFeature
                let districtCenter = turf.centerOfMass(targetFeature);
                if (!turf.booleanPointInPolygon(districtCenter, targetFeature)) {
                    districtCenter = turf.pointOnFeature(targetFeature);
                }

                districtCenter.properties = {
                    district_id: districtId,
                    regency: cityName,
                    district: districtName,
                    pria: props.pria || 0,
                    wanita: props.wanita || 0,
                    total_penduduk: props.total_penduduk || 0
                };
                districtCentroids.push(districtCenter);

                // Kumpulkan polygon kecamatan untuk menghitung centroid KOTA
                if (!cityPolygons[cityName]) {
                    cityPolygons[cityName] = [];
                }
                cityPolygons[cityName].push(targetFeature);

            } catch (e) {
                console.warn("Gagal hitung titik kecamatan:", districtName, e);
            }
        });

        // --- GENERATE CENTROID KOTA PRESISI ---
        const cityCentroids = Object.keys(cityPolygons).map(cityName => {
            const featureColl = turf.featureCollection(cityPolygons[cityName]);

            // Cari titik tengah dari seluruh gabungan polygon kecamatan di kota tsb
            let cityCenter = turf.centerOfMass(featureColl);

            // Mastiin titik kota berada DI DALAM salah satu polygon kecamatannya (tidak melayang di laut)
            const isInsideAny = cityPolygons[cityName].some(poly => turf.booleanPointInPolygon(cityCenter, poly));
            if (!isInsideAny) {
                cityCenter = turf.pointOnFeature(featureColl);
            }

            cityCenter.properties = { regency: cityName };
            return cityCenter;
        });

        // =========================================================================
        // 2. REGISTER SOURCES & LAYERS
        // =========================================================================

        map.addSource('map-kecamatan', {
            type: 'vector',
            url: 'http://localhost:3000/map' // Endpoint Martin
        });

        map.addSource('centroid-kota', { type: 'geojson', data: turf.featureCollection(cityCentroids) });
        map.addSource('centroid-kecamatan', { type: 'geojson', data: turf.featureCollection(districtCentroids) });

        // Polygon Dasar (Vector Tile Martin)
        map.addLayer({
            'id': 'polygon-base',
            'type': 'fill',
            'source': 'map-kecamatan',
            'source-layer': 'map',
            'paint': {
                'fill-color': '#cbd5e1',
                'fill-opacity': 0.2,
                'fill-outline-color': '#64748b'
            }
        });

        // Polygon Aktif / Selection
        map.addLayer({
            'id': 'polygon-active',
            'type': 'fill',
            'source': 'map-kecamatan',
            'source-layer': 'map',
            'paint': {
                'fill-color': '#2563eb',
                'fill-opacity': 0.65,
                'fill-outline-color': '#1d4ed8'
            },
            'filter': ['==', ['get', 'district'], '']
        });

        // Titik Kecamatan (Orange)
        map.addLayer({
            'id': 'titik-kecamatan',
            'type': 'circle',
            'source': 'centroid-kecamatan',
            'layout': { 'visibility': 'none' },
            'paint': {
                'circle-radius': 8,
                'circle-color': '#ff6b00',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Titik Kota (Merah)
        map.addLayer({
            'id': 'titik-kota',
            'type': 'circle',
            'source': 'centroid-kota',
            'paint': {
                'circle-radius': 11,
                'circle-color': '#ef4444',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        // =========================================================================
        // 3. LABEL NAMA HTML MARKERS
        // =========================================================================

        // Label Kota
        cityCentroids.forEach(c => {
            const el = document.createElement('div');
            el.className = 'marker-label-kota';
            el.innerText = c.properties.regency;
            el.style.cssText = `
                color: #dc2626;
                font-weight: bold;
                font-size: 13px;
                font-family: sans-serif;
                background: rgba(255, 255, 255, 0.9);
                padding: 2px 6px;
                border-radius: 4px;
                border: 1px solid #fca5a5;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                pointer-events: none;
                white-space: nowrap;
            `;

            const marker = new maplibregl.Marker({ element: el, offset: [0, 22] })
                .setLngLat(c.geometry.coordinates)
                .addTo(map);

            marker.getElement().style.pointerEvents = 'none';
            cityMarkers.push(marker);
        });

        // Label Kecamatan
        districtCentroids.forEach(d => {
            const el = document.createElement('div');
            el.className = 'marker-label-kecamatan';
            el.innerText = d.properties.district;
            el.dataset.regency = d.properties.regency;
            el.style.cssText = `
                color: #0c0401;
                font-weight: 600;
                font-size: 12px;
                font-family: sans-serif;
                background: rgba(255, 255, 255, 0.9);
                padding: 1px 5px;
                border-radius: 4px;
                border: 1px solid #fed7aa;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12);
                pointer-events: none;
                white-space: nowrap;
                display: none;
            `;

            const marker = new maplibregl.Marker({ element: el, offset: [0, 16] })
                .setLngLat(d.geometry.coordinates)
                .addTo(map);

            marker.getElement().style.pointerEvents = 'none';
            districtMarkers.push({ marker, element: el, regency: d.properties.regency });
        });

        // =========================================================================
        // 4. INTERAKSI & DRILL-DOWN
        // =========================================================================
        // =========================================================================
        // 4. INTERAKSI & DRILL-DOWN (KLIK TITIK KOTA MERAH)
        // =========================================================================

        // Klik Titik Kota (Merah)
        map.on('click', 'titik-kota', (e) => {
            // Stop event agar tidak menembus ke polygon di bawahnya
            if (e.originalEvent) {
                e.originalEvent.cancelBubble = true;
            }

            if (!e.features || e.features.length === 0) return;
            const cityName = e.features[0].properties.regency;
            console.log("Klik Titik Kota:", cityName);

            // PERBAIKAN UTAMA:
            // Highlight SELURUH POLYGON KECAMATAN yang ada di kota ini di layer polygon-active!
            map.setFilter('polygon-active', ['==', ['get', 'regency'], cityName]);

            // 1. Filter layer titik kecamatan agar hanya menampilkan kecamatan di kota ini
            map.setFilter('titik-kecamatan', ['==', ['get', 'regency'], cityName]);

            // 2. Sembunyikan titik & label Kota
            map.setLayoutProperty('titik-kota', 'visibility', 'none');
            cityMarkers.forEach(m => m.getElement().style.display = 'none');

            // 3. Tampilkan titik & label Kecamatan khusus kota ini
            map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
            districtMarkers.forEach(item => {
                item.element.style.display = (item.regency === cityName) ? 'block' : 'none';
            });

            // 4. FitBounds utuh 1 kota (semua polygon + titik orange muat dalam 1 layar)
            const cityFeatures = geojsonData.features.filter(f => {
                const props = f.properties || {};
                const reg = props.regency || props.kabupaten || props.kota;
                return reg === cityName;
            });

            if (cityFeatures.length > 0) {
                const cityCollection = turf.featureCollection(cityFeatures);
                const bbox = turf.bbox(cityCollection);

                map.fitBounds(bbox, {
                    padding: { top: 90, bottom: 90, left: 90, right: 380 }, // Ruang aman dari panel filter kanan
                    maxZoom: 11, // Batas zoom aman agar seluruh kota & titik orange kelihatan
                    duration: 1300
                });
            }
        });
        // });
        // // Klik Titik Kota (Merah)
        // map.on('click', 'titik-kota', (e) => {
        //     // 🛑 PENTING: Mencegah klik tembus/bocor ke polygon-base di bawahnya!
        //     if (e.originalEvent) {
        //         e.originalEvent.cancelBubble = true;
        //     }

        //     if (!e.features || e.features.length === 0) return;
        //     const cityName = e.features[0].properties.regency;
        //     console.log("Klik Titik Kota Murni:", cityName);

        //     // Reset polygon aktif (biru gelap) supaya tidak ada kecamatan yang ter-highlight tidak sengaja
        //     map.setFilter('polygon-active', ['==', ['get', 'district'], '']);

        //     // 1. Filter titik kecamatan khusus kota ini
        //     map.setFilter('titik-kecamatan', ['==', ['get', 'regency'], cityName]);

        //     // 2. Sembunyikan titik & marker label Kota
        //     map.setLayoutProperty('titik-kota', 'visibility', 'none');
        //     cityMarkers.forEach(m => m.getElement().style.display = 'none');

        //     // 3. Tampilkan titik & marker label Kecamatan
        //     map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
        //     districtMarkers.forEach(item => {
        //         item.element.style.display = (item.regency === cityName) ? 'block' : 'none';
        //     });

        //     // 4. FitBounds Presisi berdasarkan sebaran titik-titik kecamatannya
        //     const targetDistrictCentroids = districtCentroids.filter(d => d.properties.regency === cityName);

        //     if (targetDistrictCentroids.length > 0) {
        //         const pointsCollection = turf.featureCollection(targetDistrictCentroids);
        //         const bbox = turf.bbox(pointsCollection);

        //         map.fitBounds(bbox, {
        //             padding: { top: 100, bottom: 100, left: 100, right: 350 },
        //             maxZoom: 13,
        //             duration: 1400
        //         });
        //     }
        // });

        // Klik Kecamatan / Polygon
        const handleDistrictClick = (e) => {
            if (!e.features || e.features.length === 0) return;
            const props = e.features[0].properties;
            const districtName = props.district;

            if (!districtName) return;

            map.setFilter('polygon-active', ['==', ['get', 'district'], districtName]);

            const feature = geojsonData.features.find(f => f.properties.district === districtName);
            if (feature) {
                const bbox = turf.bbox(feature);
                map.fitBounds(bbox, { padding: 90, duration: 1200 });
            }
        };

        map.on('click', 'titik-kecamatan', handleDistrictClick);
        map.on('click', 'polygon-base', handleDistrictClick);

        // Reset ke Level Kota saat Zoom Out
        map.on('zoomend', () => {
            if (map.getZoom() < 8.5) {
                map.setFilter('polygon-active', ['==', ['get', 'district'], '']);
                map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');
                districtMarkers.forEach(item => item.element.style.display = 'none');

                map.setLayoutProperty('titik-kota', 'visibility', 'visible');
                cityMarkers.forEach(m => m.getElement().style.display = 'block');
            }
        });

        // Cursor Pointer
        const setCursor = (c) => () => map.getCanvas().style.cursor = c;
        map.on('mouseenter', 'titik-kota', setCursor('pointer'));
        map.on('mouseleave', 'titik-kota', setCursor(''));
        map.on('mouseenter', 'titik-kecamatan', setCursor('pointer'));
        map.on('mouseleave', 'titik-kecamatan', setCursor(''));

    } catch (error) {
        console.error("Error peta:", error);
    }
});