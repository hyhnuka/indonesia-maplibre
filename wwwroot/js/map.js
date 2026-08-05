// =========================================================================
// 1. INISIALISASI PETA
// =========================================================================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [118.0, -2.5], // Titik tengah Indonesia
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
        // 1. TETAP FETCH GEOJSON HANYA UNTUK HITUNG CENTROID TURF.JS
        const response = await fetch('/data/map.geojson');
        if (!response.ok) throw new Error("Gagal load map.geojson untuk centroid!");
        const geojsonData = await response.json();

        // =========================================================================
        // 1. HITUNG CENTROID KECAMATAN & KOTA (TURF.JS)
        // =========================================================================
        const districtCentroids = [];
        const cityPolygons = {};

        geojsonData.features.forEach(feature => {
            const props = feature.properties || {};
            const cityName = props.regency || "Surabaya";
            const districtName = props.district || "Unknown";

            // Hitung Titik Kecamatan
            try {
                let targetFeature = feature;
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

                let districtCenter = turf.centerOfMass(targetFeature);
                if (!turf.booleanPointInPolygon(districtCenter, targetFeature)) {
                    districtCenter = turf.pointOnFeature(targetFeature);
                }

                districtCenter.properties = {
                    regency: cityName,
                    district: districtName,
                    pria: props.pria || 0,
                    wanita: props.wanita || 0,
                    total_penduduk: props.total_penduduk || 0
                };
                districtCentroids.push(districtCenter);
            } catch (e) {
                console.warn("Gagal hitung titik kecamatan:", districtName, e);
            }

            if (!cityPolygons[cityName]) {
                cityPolygons[cityName] = [];
            }
            cityPolygons[cityName].push(feature);
        });

        // GENERATE CITY CENTROIDS 
        const cityCentroids = Object.keys(cityPolygons).map(cityName => {
            const featureColl = turf.featureCollection(cityPolygons[cityName]);
            const cityCenter = turf.centerOfMass(featureColl);
            cityCenter.properties = { regency: cityName };
            return cityCenter;
        });

        // =========================================================================
        // 2. REGISTER SOURCES (MARTIN VECTOR TILE + CENTROID GEOJSON)
        // =========================================================================

        // 🟢 SOURCE POLYGON SEKARANG MENGGUNAKAN MARTIN VECTOR TILE SERVER
        map.addSource('map-kecamatan', {
            type: 'vector',
            url: 'http://localhost:3000/map' // Endpoint Martin
        });

        // Source Point Centroid (Tetap GeoJSON Ringan)
        map.addSource('centroid-kota', { type: 'geojson', data: turf.featureCollection(cityCentroids) });
        map.addSource('centroid-kecamatan', { type: 'geojson', data: turf.featureCollection(districtCentroids) });

        // Polygon Dasar (Vector Tile Martin)
        map.addLayer({
            'id': 'polygon-base',
            'type': 'fill',
            'source': 'map-kecamatan',
            'source-layer': 'map', // Nama source ID di Martin
            'paint': {
                'fill-color': '#cbd5e1',
                'fill-opacity': 0.2,
                'fill-outline-color': '#64748b'
            }
        });

        // Polygon Aktif / Selection (Vector Tile Martin)
        map.addLayer({
            'id': 'polygon-active',
            'type': 'fill',
            'source': 'map-kecamatan',
            'source-layer': 'map', // Nama source ID di Martin
            'paint': {
                'fill-color': '#2563eb',
                'fill-opacity': 0.65,
                'fill-outline-color': '#1d4ed8'
            },
            'filter': ['==', ['get', 'district'], '']
        });

        // Titik Kecamatan 
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

        // Titik Kota 
        map.addLayer({
            'id': 'titik-kota',
            'type': 'circle',
            'source': 'centroid-kota',
            'paint': {
                'circle-radius': 11,
                'circle-color': '#ef4444',
                'circle-stroke-width': 0
            }
        });

        // =========================================================================
        // 3. LABEL NAMA HTML MARKERS (TIDAK ADA PERUBAHAN)
        // =========================================================================

        // A. Label Nama KOTA/KABUPATEN
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

        // B. Label Nama KECAMATAN 
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
        // 🖱️ 4. LOGIKA INTERAKSI & DRILL-DOWN (TIDAK ADA PERUBAHAN)
        // =========================================================================

        // Klik Titik Kota 
        map.on('click', 'titik-kota', (e) => {
            if (!e.features || e.features.length === 0) return;
            const cityName = e.features[0].properties.regency;
            console.log("Klik Titik Kota:", cityName);

            map.setFilter('titik-kecamatan', ['==', ['get', 'regency'], cityName]);

            map.setLayoutProperty('titik-kota', 'visibility', 'none');
            cityMarkers.forEach(m => m.getElement().style.display = 'none');

            map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
            districtMarkers.forEach(item => {
                if (item.regency === cityName) {
                    item.element.style.display = 'block';
                } else {
                    item.element.style.display = 'none';
                }
            });

            const cityFeatures = geojsonData.features.filter(f => f.properties.regency === cityName);
            if (cityFeatures.length > 0) {
                const bbox = turf.bbox(turf.featureCollection(cityFeatures));
                map.fitBounds(bbox, { padding: 80, duration: 1400 });
            }
        });

        // Klik Titik Kecamatan / Polygon
        const handleDistrictClick = (e) => {
            if (!e.features || e.features.length === 0) return;
            const props = e.features[0].properties;
            const districtName = props.district;

            if (!districtName) return;
            console.log("Klik Kecamatan:", districtName);

            map.setFilter('polygon-active', ['==', ['get', 'district'], districtName]);

            const feature = geojsonData.features.find(f => f.properties.district === districtName);
            if (feature) {
                const bbox = turf.bbox(feature);
                map.fitBounds(bbox, { padding: 90, duration: 1200 });
            }
        };

        map.on('click', 'titik-kecamatan', handleDistrictClick);
        map.on('click', 'polygon-base', handleDistrictClick);

        // Auto Reset Zoom Out (Threshold 8.5)
        map.on('zoomend', () => {
            const currentZoom = map.getZoom();

            if (currentZoom < 8.5) {
                console.log("🔄 Reset ke Level Kota");

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
        console.error(" Error peta:", error);
    }
});

// =========================================================================
// 1. INISIALISASI PETA
// =========================================================================
// const map = new maplibregl.Map({
//     container: 'map',
//     style: 'https:tiles.openfreemap.org/styles/bright',
//     center: [118.0, -2.5], Titik tengah Indonesia
//     zoom: 5
// });

// map.addControl(new maplibregl.NavigationControl());

// let cityMarkers = [];
// let districtMarkers = [];

// map.on('load', async () => {
//     Hide Nama Kota & Kecamatan bawaan Basemap
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

//     try {
//         console.log("Memuat data map.geojson...");
//         Path absolut mengarah ke wwwroot/data/map.geojson
//         const response = await fetch('/data/map.geojson');
//         if (!response.ok) throw new Error("Gagal load map.geojson!");
//         const geojsonData = await response.json();

//         =========================================================================
//         1. HITUNG CENTROID KECAMATAN & KOTA
//         =========================================================================
//         const districtCentroids = [];
//         const cityPolygons = {};

//         geojsonData.features.forEach(feature => {
//             const props = feature.properties || {};
//             const cityName = props.regency || "Surabaya";
//             const districtName = props.district || "Unknown";

//             Hitung Titik Kecamatan
//             try {
//                 let targetFeature = feature;
//                 if (feature.geometry.type === 'MultiPolygon') {
//                     let maxArea = 0;
//                     let largestPolygon = null;
//                     feature.geometry.coordinates.forEach(coords => {
//                         const poly = turf.polygon(coords);
//                         const area = turf.area(poly);
//                         if (area > maxArea) {
//                             maxArea = area;
//                             largestPolygon = poly;
//                         }
//                     });
//                     if (largestPolygon) targetFeature = largestPolygon;
//                 }

//                 let districtCenter = turf.centerOfMass(targetFeature);
//                 if (!turf.booleanPointInPolygon(districtCenter, targetFeature)) {
//                     districtCenter = turf.pointOnFeature(targetFeature);
//                 }

//                 districtCenter.properties = {
//                     regency: cityName,
//                     district: districtName,
//                     pria: props.pria || 0,
//                     wanita: props.wanita || 0,
//                     total_penduduk: props.total_penduduk || 0
//                 };
//                 districtCentroids.push(districtCenter);
//             } catch (e) {
//                 console.warn("Gagal hitung titik kecamatan:", districtName, e);
//             }

//             if (!cityPolygons[cityName]) {
//                 cityPolygons[cityName] = [];
//             }
//             cityPolygons[cityName].push(feature);
//         });

//         GENERATE CITY CENTROIDS 
//         const cityCentroids = Object.keys(cityPolygons).map(cityName => {
//             const featureColl = turf.featureCollection(cityPolygons[cityName]);
//             const cityCenter = turf.centerOfMass(featureColl);
//             cityCenter.properties = { regency: cityName };
//             return cityCenter;
//         });

//         =========================================================================
//         2. REGISTER SOURCES & LAYERS CIRCLE 
//         =========================================================================
//         map.addSource('map-kecamatan', { type: 'geojson', data: geojsonData });
//         map.addSource('centroid-kota', { type: 'geojson', data: turf.featureCollection(cityCentroids) });
//         map.addSource('centroid-kecamatan', { type: 'geojson', data: turf.featureCollection(districtCentroids) });

//         Polygon Dasar
//         map.addLayer({
//             'id': 'polygon-base',
//             'type': 'fill',
//             'source': 'map-kecamatan',
//             'paint': {
//                 'fill-color': '#cbd5e1',
//                 'fill-opacity': 0.2,
//                 'fill-outline-color': '#64748b'
//             }
//         });

//         Polygon Aktif (Biru)
//         map.addLayer({
//             'id': 'polygon-active',
//             'type': 'fill',
//             'source': 'map-kecamatan',
//             'paint': {
//                 'fill-color': '#2563eb',
//                 'fill-opacity': 0.65,
//                 'fill-outline-color': '#1d4ed8'
//             },
//             'filter': ['==', ['get', 'district'], '']
//         });

//         Titik Kecamatan 
//         map.addLayer({
//             'id': 'titik-kecamatan',
//             'type': 'circle',
//             'source': 'centroid-kecamatan',
//             'layout': { 'visibility': 'none' },
//             'paint': {
//                 'circle-radius': 8,
//                 'circle-color': '#ff6b00',
//                 'circle-stroke-width': 2,
//                 'circle-stroke-color': '#ffffff'
//             }
//         });

//         Titik Kota 
//         map.addLayer({
//             'id': 'titik-kota',
//             'type': 'circle',
//             'source': 'centroid-kota',
//             'paint': {
//                 'circle-radius': 11,
//                 'circle-color': '#ef4444',
//                 'circle-stroke-width': 0
//             }
//         });

//         =========================================================================
//         3. LABEL NAMA HTML MARKERS
//         =========================================================================

//         A. Label Nama KOTA/KABUPATEN
//         cityCentroids.forEach(c => {
//             const el = document.createElement('div');
//             el.className = 'marker-label-kota';
//             el.innerText = c.properties.regency;
//             el.style.cssText = `
//                 color: #dc2626;
//                 font-weight: bold;
//                 font-size: 13px;
//                 font-family: sans-serif;
//                 background: rgba(255, 255, 255, 0.9);
//                 padding: 2px 6px;
//                 border-radius: 4px;
//                 border: 1px solid #fca5a5;
//                 box-shadow: 0 2px 4px rgba(0,0,0,0.15);
//                 pointer-events: none;
//                 white-space: nowrap;
//             `;

//             const marker = new maplibregl.Marker({ element: el, offset: [0, 22] })
//                 .setLngLat(c.geometry.coordinates)
//                 .addTo(map);

//             marker.getElement().style.pointerEvents = 'none';
//             cityMarkers.push(marker);
//         });

//         B. Label Nama KECAMATAN 
//         districtCentroids.forEach(d => {
//             const el = document.createElement('div');
//             el.className = 'marker-label-kecamatan';
//             el.innerText = d.properties.district;
//             el.dataset.regency = d.properties.regency;
//             el.style.cssText = `
//                 color: #0c0401;
//                 font-weight: 600;
//                 font-size: 12px;
//                 font-family: sans-serif;
//                 background: rgba(255, 255, 255, 0.9);
//                 padding: 1px 5px;
//                 border-radius: 4px;
//                 border: 1px solid #fed7aa;
//                 box-shadow: 0 1px 3px rgba(0,0,0,0.12);
//                 pointer-events: none;
//                 white-space: nowrap;
//                 display: none;
//             `;

//             const marker = new maplibregl.Marker({ element: el, offset: [0, 16] })
//                 .setLngLat(d.geometry.coordinates)
//                 .addTo(map);

//             marker.getElement().style.pointerEvents = 'none';
//             districtMarkers.push({ marker, element: el, regency: d.properties.regency });
//         });

//         =========================================================================
//         🖱️ 4. LOGIKA INTERAKSI & DRILL-DOWN
//         =========================================================================

//         Klik Titik Kota 
//         map.on('click', 'titik-kota', (e) => {
//             if (!e.features || e.features.length === 0) return;
//             const cityName = e.features[0].properties.regency;
//             console.log("Klik Titik Kota:", cityName);

//             map.setFilter('titik-kecamatan', ['==', ['get', 'regency'], cityName]);

//             map.setLayoutProperty('titik-kota', 'visibility', 'none');
//             cityMarkers.forEach(m => m.getElement().style.display = 'none');

//             map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
//             districtMarkers.forEach(item => {
//                 if (item.regency === cityName) {
//                     item.element.style.display = 'block';
//                 } else {
//                     item.element.style.display = 'none';
//                 }
//             });

//             const cityFeatures = geojsonData.features.filter(f => f.properties.regency === cityName);
//             if (cityFeatures.length > 0) {
//                 const bbox = turf.bbox(turf.featureCollection(cityFeatures));
//                 map.fitBounds(bbox, { padding: 80, duration: 1400 });
//             }
//         });

//         Klik Titik Kecamatan / Polygon
//         const handleDistrictClick = (e) => {
//             if (!e.features || e.features.length === 0) return;
//             const props = e.features[0].properties;
//             const districtName = props.district;

//             if (!districtName) return;
//             console.log("Klik Kecamatan:", districtName);

//             map.setFilter('polygon-active', ['==', ['get', 'district'], districtName]);

//             const feature = geojsonData.features.find(f => f.properties.district === districtName);
//             if (feature) {
//                 const bbox = turf.bbox(feature);
//                 map.fitBounds(bbox, { padding: 90, duration: 1200 });
//             }
//         };

//         map.on('click', 'titik-kecamatan', handleDistrictClick);
//         map.on('click', 'polygon-base', handleDistrictClick);

//         Auto Reset Zoom Out (Threshold 8.5)
//         map.on('zoomend', () => {
//             const currentZoom = map.getZoom();

//             if (currentZoom < 8.5) {
//                 console.log("🔄 Reset ke Level Kota");

//                 map.setFilter('polygon-active', ['==', ['get', 'district'], '']);

//                 map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');
//                 districtMarkers.forEach(item => item.element.style.display = 'none');

//                 map.setLayoutProperty('titik-kota', 'visibility', 'visible');
//                 cityMarkers.forEach(m => m.getElement().style.display = 'block');
//             }
//         });

//         Cursor Pointer
//         const setCursor = (c) => () => map.getCanvas().style.cursor = c;
//         map.on('mouseenter', 'titik-kota', setCursor('pointer'));
//         map.on('mouseleave', 'titik-kota', setCursor(''));
//         map.on('mouseenter', 'titik-kecamatan', setCursor('pointer'));
//         map.on('mouseleave', 'titik-kecamatan', setCursor(''));

//     } catch (error) {
//         console.error(" Error peta:", error);
//     }
// });