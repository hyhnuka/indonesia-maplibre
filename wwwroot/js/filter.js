const filterState = {
    city: 'all',
    district: 'all',
    category: 'none',
    parameter: 'none',
    gender: 'all',
    ageGroup: '0_4'
};

// =========================================================================
// 1. POPULATE DROPDOWN KOTA
// =========================================================================
async function populateCityDropdown() {
    try {
        const response = await fetch('/api/map/cities');
        if (!response.ok) throw new Error('Gagal memuat data kota dari API');

        const cities = await response.json();
        const citySelect = document.getElementById('filter-city');

        if (citySelect) {
            citySelect.innerHTML = '<option value="all" data-lng="118.0" data-lat="-2.5">Semua Kota / Kabupaten</option>';
            cities.forEach(item => {
                const option = document.createElement('option');
                option.value = item.regency;
                option.textContent = item.regency;
                option.dataset.lng = item.lng;
                option.dataset.lat = item.lat;
                option.dataset.minLng = item.min_lng;
                option.dataset.minLat = item.min_lat;
                option.dataset.maxLng = item.max_lng;
                option.dataset.maxLat = item.max_lat;
                citySelect.appendChild(option);
            });
            console.log(`✅ ${cities.length} kota dimuat.`);
        }
    } catch (err) {
        console.error("Error populateCityDropdown:", err);
    }
}

// =========================================================================
// 2. POPULATE DROPDOWN KECAMATAN
// =========================================================================
async function populateDistrictDropdown(cityName) {
    const districtSelect = document.getElementById('filter-district');
    if (!districtSelect) return;

    districtSelect.innerHTML = '<option value="all">Semua Kecamatan</option>';

    if (cityName === 'all') {
        districtSelect.disabled = true;
        filterState.district = 'all';
        return;
    }

    try {
        const response = await fetch(`/api/map/districts?city=${encodeURIComponent(cityName)}`);
        if (!response.ok) throw new Error('Gagal memuat kecamatan');

        const districts = await response.json();

        districts.forEach(item => {
            const option = document.createElement('option');
            option.value = item.district;
            option.textContent = item.district;
            option.dataset.lng = item.lng;
            option.dataset.lat = item.lat;
            option.dataset.id = item.district_id || item.districtId || item.DistrictId || '';

            districtSelect.appendChild(option);
        });

        districtSelect.disabled = false;
    } catch (err) {
        console.error("Error populateDistrictDropdown:", err);
    }
}

// =========================================================================
// 3. HELPER: MENENTUKAN COLUMN DATABASE DARI FILTER YANG AKTIF
// =========================================================================
function getActiveDataProperty() {
    const param = filterState.parameter;
    const gender = filterState.gender;
    const age = filterState.ageGroup;

    // Jika belum memilih parameter -> kembalikan 'none'
    if (param === 'none') return 'none';

    if (param === 'total_population') {
        return 'total_population';
    }
    else if (param === 'gender') {
        if (gender === 'male') return 'male_count';
        if (gender === 'female') return 'female_count';
        return 'total_population';
    }
    else if (param === 'age') {
        const suffix = gender === 'female' ? '_f' : '_m';
        return `age_${age}${suffix}`;
    }

    return 'none';
}

// =========================================================================
// 4. PENERAPAN FILTER VISUAL KE MAPLIBRE
// =========================================================================
function applyFilters() {
    if (typeof map === 'undefined' || !map.isStyleLoaded()) return;

    const city = filterState.city;
    const district = filterState.district;

    // A. FILTER SPASIAL WILAYAH (KOTA / KECAMATAN)
    if (city !== 'all') {
        const cityFilter = ['==', ['get', 'regency'], city];

        // Saring Polygon Base hanya untuk Kota yang dipilih
        map.setFilter('polygon-base', cityFilter);

        // Titik Oranye Kecamatan
        if (map.getLayer('titik-kecamatan')) {
            map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
            map.setFilter('titik-kecamatan', cityFilter);
        }

        // Sembunyikan Titik Merah Kota
        if (map.getLayer('titik-kota')) map.setLayoutProperty('titik-kota', 'visibility', 'none');

        // Highlight Kecamatan Spesifik
        if (map.getLayer('polygon-active')) {
            if (district === 'all') {
                map.setFilter('polygon-active', ['==', ['get', 'district'], '___NO_SELECTION___']);
            } else {
                map.setFilter('polygon-active', [
                    'all',
                    ['==', ['get', 'regency'], city],
                    ['==', ['get', 'district'], district]
                ]);
            }
        }
    } else {
        // Mode Nasional / Semua Kota
        map.setFilter('polygon-base', null);

        if (map.getLayer('titik-kecamatan')) map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');
        if (map.getLayer('titik-kota')) map.setLayoutProperty('titik-kota', 'visibility', 'visible');

        if (map.getLayer('polygon-active')) {
            map.setFilter('polygon-active', ['==', ['get', 'district'], '___NO_SELECTION___']);
        }
    }

    // B. CHOROPLETH COLORING BERDASARKAN PARAMETER DATA
    const targetProperty = getActiveDataProperty();
    if (typeof updateChoroplethLayer === 'function') {
        updateChoroplethLayer(targetProperty);
    }
}

// =========================================================================
// 5. EVENT LISTENERS & INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    populateCityDropdown();

    // A. TOGGLE SIDEBAR SLIDE IN / OUT
    const btnFilter = document.getElementById("nav-btn-filter");
    const btnInsight = document.getElementById("nav-btn-insight");
    const sidebarLeft = document.getElementById("sidebar-left");
    const sidebarRight = document.getElementById("sidebar-right");

    const triggerMapResize = () => {
        setTimeout(() => {
            if (typeof map !== 'undefined' && map) map.resize();
        }, 350);
    };

    if (btnFilter && sidebarLeft) {
        btnFilter.addEventListener("click", () => {
            sidebarLeft.classList.toggle("collapsed");
            btnFilter.classList.toggle("active");
            triggerMapResize();
        });
    }

    if (btnInsight && sidebarRight) {
        btnInsight.addEventListener("click", () => {
            sidebarRight.classList.toggle("collapsed");
            btnInsight.classList.toggle("active");
            triggerMapResize();
        });
    }

    // B. EVENT LISTENER KATEGORI & PARAMETER
    const catSelect = document.getElementById('filter-category');
    const paramSelect = document.getElementById('filter-parameter');

    catSelect?.addEventListener('change', (e) => {
        filterState.category = e.target.value;
        if (filterState.category !== 'none') {
            if (paramSelect) paramSelect.disabled = false;
        } else {
            if (paramSelect) {
                paramSelect.value = 'none';
                paramSelect.disabled = true;
            }
            filterState.parameter = 'none';
            applyFilters();
        }
    });

    paramSelect?.addEventListener('change', (e) => {
        filterState.parameter = e.target.value;

        const wrapperGender = document.getElementById('wrapper-gender');
        const wrapperAge = document.getElementById('wrapper-age');

        if (filterState.parameter === 'gender') {
            if (wrapperGender) wrapperGender.style.display = 'block';
            if (wrapperAge) wrapperAge.style.display = 'none';
        } else if (filterState.parameter === 'age') {
            if (wrapperGender) wrapperGender.style.display = 'block';
            if (wrapperAge) wrapperAge.style.display = 'block';
        } else {
            if (wrapperGender) wrapperGender.style.display = 'none';
            if (wrapperAge) wrapperAge.style.display = 'none';
        }

        applyFilters();
    });

    // C. EVENT LISTENER SUB-PARAMETERS (GENDER & USIA)
    document.getElementById('filter-gender')?.addEventListener('change', (e) => {
        filterState.gender = e.target.value;
        applyFilters();
    });

    document.getElementById('filter-age-group')?.addEventListener('change', (e) => {
        filterState.ageGroup = e.target.value;
        applyFilters();
    });

    // D. EVENT LISTENER DROPDOWN KOTA & KECAMATAN
    let isProgrammaticZoom = false;

    document.getElementById('filter-city')?.addEventListener('change', async (e) => {
        const select = e.target;
        const selectedOption = select.options[select.selectedIndex];

        filterState.city = select.value;
        filterState.district = 'all';

        await populateDistrictDropdown(filterState.city);

        if (filterState.city === 'all') {
            isProgrammaticZoom = true;
            map.flyTo({ center: [118.0, -2.5], zoom: 5, duration: 1200 });
            setTimeout(() => { isProgrammaticZoom = false; }, 1300);
        } else {
            const minLng = parseFloat(selectedOption.dataset.minLng);
            const minLat = parseFloat(selectedOption.dataset.minLat);
            const maxLng = parseFloat(selectedOption.dataset.maxLng);
            const maxLat = parseFloat(selectedOption.dataset.maxLat);

            if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
                isProgrammaticZoom = true;
                map.fitBounds([
                    [minLng, minLat],
                    [maxLng, maxLat]
                ], {
                    padding: { top: 50, bottom: 50, left: 50, right: 50 },
                    maxZoom: 11,
                    duration: 1300,
                    essential: true
                });
                setTimeout(() => { isProgrammaticZoom = false; }, 1400);
            } else {
                const lng = parseFloat(selectedOption.dataset.lng);
                const lat = parseFloat(selectedOption.dataset.lat);
                if (!isNaN(lng) && !isNaN(lat)) {
                    map.flyTo({ center: [lng, lat], zoom: 10, duration: 1300 });
                }
            }
        }

        applyFilters();
    });

    // document.getElementById('filter-district')?.addEventListener('change', async (e) => {
    //     const select = e.target;
    //     const selectedOption = select.options[select.selectedIndex];

    //     filterState.district = select.value;

    //     const lng = parseFloat(selectedOption.dataset.lng);
    //     const lat = parseFloat(selectedOption.dataset.lat);
    //     let districtId = selectedOption.dataset.id;

    //     if (!isNaN(lng) && !isNaN(lat) && filterState.district !== 'all') {
    //         map.flyTo({ center: [lng, lat], zoom: 12.5, duration: 1200 });
    //     }

    //     applyFilters();

    //     if (filterState.district !== 'all') {
    //         if (!districtId) {
    //             try {
    //                 const res = await fetch(`/api/demographics/districts?regencyName=${encodeURIComponent(filterState.city)}`);
    //                 if (res.ok) {
    //                     const distList = await res.json();
    //                     const match = distList.find(d => (d.district || d.District) === filterState.district);
    //                     if (match) districtId = match.districtId || match.DistrictId || match.district_id;
    //                 }
    //             } catch (err) {
    //                 console.error("Gagal mencari district_id fallback:", err);
    //             }
    //         }

    //         if (districtId) {
    //             try {
    //                 const sidebarRight = document.getElementById('sidebar-right');
    //                 const btnInsight = document.getElementById('nav-btn-insight');
    //                 if (sidebarRight && sidebarRight.classList.contains('collapsed')) {
    //                     sidebarRight.classList.remove('collapsed');
    //                     if (btnInsight) btnInsight.classList.add('active');
    //                     if (typeof map !== 'undefined' && map) map.resize();
    //                 }

    //                 console.log(`Fetching data detail insight untuk District ID: ${districtId}`);

    //                 const response = await fetch(`/api/demographics/detail/${districtId}`);
    //                 if (response.ok) {
    //                     const data = await response.json();
    //                     if (typeof updateInsightPanel === 'function') {
    //                         updateInsightPanel(data);
    //                     }
    //                 } else {
    //                     console.warn(`⚠️ Status HTTP: ${response.status}`);
    //                 }
    //             } catch (err) {
    //                 console.error("❌ Error Fetching Insight:", err);
    //             }
    //         }
    //     }
    // });
    // =========================================================================
    // EVENT SAAT KECAMATAN DIPILIH DARI DROPDOWN
    // =========================================================================
    document.getElementById('filter-district')?.addEventListener('change', async (e) => {
        const select = e.target;
        const selectedOption = select.options[select.selectedIndex];

        filterState.district = select.value;

        // -----------------------------------------------------------------
        // KONDISI 1: USER MEMILIH "SEMUA KECAMATAN"
        // -----------------------------------------------------------------
        if (filterState.district === 'all') {
            // A. Ambil data batas koordinat (Bounding Box) Kota dari dropdown Kota
            const citySelect = document.getElementById('filter-city');
            const cityOption = citySelect ? citySelect.options[citySelect.selectedIndex] : null;

            if (cityOption) {
                const minLng = parseFloat(cityOption.dataset.minLng);
                const minLat = parseFloat(cityOption.dataset.minLat);
                const maxLng = parseFloat(cityOption.dataset.maxLng);
                const maxLat = parseFloat(cityOption.dataset.maxLat);

                if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
                    isProgrammaticZoom = true;
                    map.fitBounds([
                        [minLng, minLat],
                        [maxLng, maxLat]
                    ], {
                        padding: { top: 50, bottom: 50, left: 50, right: 50 },
                        maxZoom: 11,
                        duration: 1200,
                        essential: true
                    });
                    setTimeout(() => { isProgrammaticZoom = false; }, 1300);
                } else {
                    const lng = parseFloat(cityOption.dataset.lng);
                    const lat = parseFloat(cityOption.dataset.lat);
                    if (!isNaN(lng) && !isNaN(lat)) {
                        map.flyTo({ center: [lng, lat], zoom: 10, duration: 1200 });
                    }
                }
            }

            // B. Tutup kembali Panel Insight di sebelah kanan jika sedang terbuka
            const sidebarRight = document.getElementById('sidebar-right');
            const btnInsight = document.getElementById('nav-btn-insight');
            if (sidebarRight && !sidebarRight.classList.contains('collapsed')) {
                sidebarRight.classList.add('collapsed');
                if (btnInsight) btnInsight.classList.remove('active');
                if (typeof map !== 'undefined' && map) map.resize();
            }

            // C. Terapkan filter visual (menghilangkan border seleksi kecamatan)
            applyFilters();
            return;
        }

        // -----------------------------------------------------------------
        // KONDISI 2: USER MEMILIH 1 KECAMATAN SPESIFIK
        // -----------------------------------------------------------------
        const lng = parseFloat(selectedOption.dataset.lng);
        const lat = parseFloat(selectedOption.dataset.lat);
        let districtId = selectedOption.dataset.id;

        if (!isNaN(lng) && !isNaN(lat)) {
            map.flyTo({ center: [lng, lat], zoom: 12.5, duration: 1200 });
        }

        applyFilters();

        // Fetch Insight untuk 1 Kecamatan yang dipilih
        if (!districtId) {
            try {
                const res = await fetch(`/api/demographics/districts?regencyName=${encodeURIComponent(filterState.city)}`);
                if (res.ok) {
                    const distList = await res.json();
                    const match = distList.find(d => (d.district || d.District) === filterState.district);
                    if (match) districtId = match.districtId || match.DistrictId || match.district_id;
                }
            } catch (err) {
                console.error("Gagal mencari district_id fallback:", err);
            }
        }

        if (districtId) {
            try {
                const sidebarRight = document.getElementById('sidebar-right');
                const btnInsight = document.getElementById('nav-btn-insight');
                if (sidebarRight && sidebarRight.classList.contains('collapsed')) {
                    sidebarRight.classList.remove('collapsed');
                    if (btnInsight) btnInsight.classList.add('active');
                    if (typeof map !== 'undefined' && map) map.resize();
                }

                console.log(`Fetching data detail insight untuk District ID: ${districtId}`);

                const response = await fetch(`/api/demographics/detail/${districtId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (typeof updateInsightPanel === 'function') {
                        updateInsightPanel(data);
                    }
                } else {
                    console.warn(`⚠️ Status HTTP: ${response.status}`);
                }
            } catch (err) {
                console.error("❌ Error Fetching Insight:", err);
            }
        }
    });
});