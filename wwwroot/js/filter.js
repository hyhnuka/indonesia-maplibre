const filterState = {
    city: 'all',
    district: 'all',
    category: 'none',
    parameter: 'none',
    gender: 'all',
    ageGroup: '0_4'
};

let rawCityList = [];
let rawDistrictList = [];
let isProgrammaticZoom = false;

// =========================================================================
// 1. POPULATE & RENDER DROPDOWN KOTA
// =========================================================================
async function populateCityDropdown() {
    try {
        const response = await fetch('/api/map/cities');
        if (!response.ok) throw new Error('Gagal memuat data kota dari API');

        rawCityList = await response.json();
        renderCityList(rawCityList);
    } catch (err) {
        console.error("Error populateCityDropdown:", err);
    }
}

function renderCityList(cities) {
    const listCity = document.getElementById('list-city');
    if (!listCity) return;

    listCity.innerHTML = '';

    const defaultLi = document.createElement('li');
    defaultLi.textContent = 'Semua Kota / Kabupaten';
    defaultLi.dataset.value = 'all';
    defaultLi.dataset.lng = '118.0';
    defaultLi.dataset.lat = '-2.5';
    if (filterState.city === 'all') defaultLi.classList.add('selected');
    listCity.appendChild(defaultLi);

    if (cities.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'Tidak ditemukan';
        emptyLi.className = 'no-result';
        listCity.appendChild(emptyLi);
        return;
    }

    cities.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.regency;
        li.dataset.value = item.regency;
        li.dataset.lng = item.lng;
        li.dataset.lat = item.lat;
        li.dataset.minLng = item.min_lng;
        li.dataset.minLat = item.min_lat;
        li.dataset.maxLng = item.max_lng;
        li.dataset.maxLat = item.max_lat;

        if (item.regency === filterState.city) {
            li.classList.add('selected');
        }

        listCity.appendChild(li);
    });
}

// =========================================================================
// 2. POPULATE & RENDER DROPDOWN KECAMATAN
// =========================================================================
async function populateDistrictDropdown(cityName) {
    const districtInput = document.getElementById('search-district');
    const listDistrict = document.getElementById('list-district');
    if (!districtInput || !listDistrict) return;

    districtInput.value = '';

    if (cityName === 'all') {
        districtInput.placeholder = 'Semua Kecamatan';
        districtInput.disabled = true;
        rawDistrictList = [];
        filterState.district = 'all';
        listDistrict.innerHTML = '';
        return;
    }

    districtInput.disabled = false;
    districtInput.placeholder = 'Ketik/Pilih Kecamatan...';

    try {
        const response = await fetch(`/api/map/districts?city=${encodeURIComponent(cityName)}`);
        if (!response.ok) throw new Error('Gagal memuat kecamatan');

        rawDistrictList = await response.json();
        renderDistrictList(rawDistrictList);
    } catch (err) {
        console.error("Error populateDistrictDropdown:", err);
    }
}

function renderDistrictList(districts) {
    const listDistrict = document.getElementById('list-district');
    if (!listDistrict) return;

    listDistrict.innerHTML = '';

    const defaultLi = document.createElement('li');
    defaultLi.textContent = 'Semua Kecamatan';
    defaultLi.dataset.value = 'all';
    if (filterState.district === 'all') defaultLi.classList.add('selected');
    listDistrict.appendChild(defaultLi);

    if (districts.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'Tidak ditemukan';
        emptyLi.className = 'no-result';
        listDistrict.appendChild(emptyLi);
        return;
    }

    districts.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.district;
        li.dataset.value = item.district;
        li.dataset.lng = item.lng;
        li.dataset.lat = item.lat;
        li.dataset.id = item.district_id || item.districtId || item.DistrictId || '';

        if (item.district === filterState.district) {
            li.classList.add('selected');
        }

        listDistrict.appendChild(li);
    });
}

// =========================================================================
// 3. HELPER: MENENTUKAN COLUMN DATABASE DARI FILTER YANG AKTIF
// =========================================================================
function getActiveDataProperty() {
    const param = filterState.parameter;
    const gender = filterState.gender;
    let age = filterState.ageGroup;

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
        if (age === '75_plus') age = '75plus';
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

    if (city !== 'all') {
        const cityFilter = ['==', ['get', 'regency'], city];

        map.setFilter('polygon-base', cityFilter);

        if (map.getLayer('titik-kecamatan')) {
            map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
            map.setFilter('titik-kecamatan', cityFilter);
        }

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
        map.setFilter('polygon-base', null);

        if (map.getLayer('titik-kecamatan')) map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');

        if (map.getLayer('polygon-active')) {
            map.setFilter('polygon-active', ['==', ['get', 'district'], '___NO_SELECTION___']);
        }
    }

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

    const searchCity = document.getElementById('search-city');
    const listCity = document.getElementById('list-city');
    const searchDistrict = document.getElementById('search-district');
    const listDistrict = document.getElementById('list-district');

    // --- A. SINGLE BOX INTERACTION: KOTA ---
    searchCity?.addEventListener('focus', () => {
        listCity?.classList.add('show');
    });

    searchCity?.addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        const filtered = rawCityList.filter(item =>
            item.regency.toLowerCase().includes(keyword)
        );
        renderCityList(filtered);
        listCity?.classList.add('show');
    });

    listCity?.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        if (!li || li.classList.contains('no-result')) return;

        const val = li.dataset.value;
        filterState.city = val;
        filterState.district = 'all';

        searchCity.value = val === 'all' ? '' : val;
        searchCity.placeholder = val === 'all' ? 'Semua Kota / Kabupaten' : val;
        listCity.classList.remove('show');

        // Render ulang dropdown list status active
        renderCityList(rawCityList);
        await populateDistrictDropdown(val);

        if (val === 'all') {
            isProgrammaticZoom = true;
            map.flyTo({ center: [118.0, -2.5], zoom: 5, duration: 1200 });
            setTimeout(() => { isProgrammaticZoom = false; }, 1300);
        } else {
            const minLng = parseFloat(li.dataset.minLng);
            const minLat = parseFloat(li.dataset.minLat);
            const maxLng = parseFloat(li.dataset.maxLng);
            const maxLat = parseFloat(li.dataset.maxLat);

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
                const lng = parseFloat(li.dataset.lng);
                const lat = parseFloat(li.dataset.lat);
                if (!isNaN(lng) && !isNaN(lat)) {
                    map.flyTo({ center: [lng, lat], zoom: 10, duration: 1300 });
                }
            }
        }

        applyFilters();
    });

    // --- B. SINGLE BOX INTERACTION: KECAMATAN ---
    searchDistrict?.addEventListener('focus', () => {
        listDistrict?.classList.add('show');
    });

    searchDistrict?.addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        const filtered = rawDistrictList.filter(item =>
            item.district.toLowerCase().includes(keyword)
        );
        renderDistrictList(filtered);
        listDistrict?.classList.add('show');
    });

    listDistrict?.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        if (!li || li.classList.contains('no-result')) return;

        const val = li.dataset.value;
        filterState.district = val;

        searchDistrict.value = val === 'all' ? '' : val;
        searchDistrict.placeholder = val === 'all' ? 'Semua Kecamatan' : val;
        listDistrict.classList.remove('show');
        renderDistrictList(rawDistrictList);

        if (val === 'all') {
            const activeCityLi = listCity.querySelector(`li[data-value="${filterState.city}"]`);
            if (activeCityLi) {
                const minLng = parseFloat(activeCityLi.dataset.minLng);
                const minLat = parseFloat(activeCityLi.dataset.minLat);
                const maxLng = parseFloat(activeCityLi.dataset.maxLng);
                const maxLat = parseFloat(activeCityLi.dataset.maxLat);

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
                }
            }

            const sidebarRight = document.getElementById('sidebar-right');
            const btnInsight = document.getElementById('nav-btn-insight');
            if (sidebarRight && !sidebarRight.classList.contains('collapsed')) {
                sidebarRight.classList.remove('collapsed');
                if (btnInsight) btnInsight.classList.remove('active');
                if (typeof map !== 'undefined' && map) map.resize();
            }

            applyFilters();
            return;
        }

        const lng = parseFloat(li.dataset.lng);
        const lat = parseFloat(li.dataset.lat);
        let districtId = li.dataset.id;

        if (!isNaN(lng) && !isNaN(lat)) {
            map.flyTo({ center: [lng, lat], zoom: 12.5, duration: 1200 });
        }

        applyFilters();

        if (districtId) {
            try {
                const sidebarRight = document.getElementById('sidebar-right');
                const btnInsight = document.getElementById('nav-btn-insight');
                if (sidebarRight && sidebarRight.classList.contains('collapsed')) {
                    sidebarRight.classList.remove('collapsed');
                    if (btnInsight) btnInsight.classList.add('active');
                    if (typeof map !== 'undefined' && map) map.resize();
                }

                const response = await fetch(`/api/demographics/detail/${districtId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (typeof updateInsightPanel === 'function') {
                        updateInsightPanel(data);
                    }
                }
            } catch (err) {
                console.error("Error Fetching Insight:", err);
            }
        }
    });

    // Close Dropdowns on Click Outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#wrapper-city-select')) {
            listCity?.classList.remove('show');
        }
        if (!e.target.closest('#wrapper-district-select')) {
            listDistrict?.classList.remove('show');
        }
    });

    // --- C. TOGGLE SIDEBAR BUTTONS ---
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

    // --- D. PARAMETER EVENTS ---
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

    document.getElementById('filter-gender')?.addEventListener('change', (e) => {
        filterState.gender = e.target.value;
        applyFilters();
    });

    document.getElementById('filter-age-group')?.addEventListener('change', (e) => {
        filterState.ageGroup = e.target.value;
        applyFilters();
    });
});