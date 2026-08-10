const filterState = {
    city: 'all',
    district: 'all'
};

// 1. Populate Dropdown Kota
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
                // Simpan koordinat di atribut data HTML
                option.dataset.lng = item.lng;
                option.dataset.lat = item.lat;
                citySelect.appendChild(option);
            });
            console.log(`✅ ${cities.length} kota dimuat.`);
        }
    } catch (err) {
        console.error("Error populateCityDropdown:", err);
    }
}

// 2. Populate Dropdown Kecamatan
// async function populateDistrictDropdown(cityName) {
//     const districtSelect = document.getElementById('filter-district');
//     if (!districtSelect) return;

//     districtSelect.innerHTML = '<option value="all">Semua Kecamatan</option>';

//     if (cityName === 'all') {
//         districtSelect.disabled = true;
//         filterState.district = 'all';
//         return;
//     }

//     try {
//         const response = await fetch(`/api/map/districts?city=${encodeURIComponent(cityName)}`);
//         if (!response.ok) throw new Error('Gagal memuat kecamatan');

//         const districts = await response.json();

//         districts.forEach(item => {
//             const option = document.createElement('option');
//             option.value = item.district;
//             option.textContent = item.district;
//             option.dataset.lng = item.lng;
//             option.dataset.lat = item.lat;
//             districtSelect.appendChild(option);
//         });

//         districtSelect.disabled = false;
//         console.log(`✅ ${districts.length} kecamatan dimuat untuk ${cityName}`);
//     } catch (err) {
//         console.error("Error populateDistrictDropdown:", err);
//     }
// }
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
            districtSelect.appendChild(option);
        });

        districtSelect.disabled = false;
    } catch (err) {
        console.error("Error populateDistrictDropdown:", err);
    }
}

// 3. Terapkan Filter Visual di Peta
// =========================================================================
// PENERAPAN FILTER VISUAL KE MAPLIBRE
// =========================================================================
function applyFilters() {
    if (typeof map === 'undefined' || !map.isStyleLoaded()) return;

    // Pastikan layer titik-kecamatan ada
    if (!map.getLayer('titik-kecamatan')) return;

    // ----------------------------------------------------
    // CASE 1: KOTA PILIHAN USER (Tampilkan Seluruh Titik Oren di Kota Tsb)
    // ----------------------------------------------------
    if (filterState.city !== 'all' && filterState.district === 'all') {
        const cityFilter = ['==', ['get', 'regency'], filterState.city];

        // Tampilkan layer titik & label kecamatan
        map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
        map.setFilter('titik-kecamatan', cityFilter);

        if (map.getLayer('label-kecamatan')) {
            map.setLayoutProperty('label-kecamatan', 'visibility', 'visible');
            map.setFilter('label-kecamatan', cityFilter);
        }

        // Sembunyikan titik/label kota agar tidak menumpuk
        if (map.getLayer('titik-kota')) map.setLayoutProperty('titik-kota', 'visibility', 'none');
        if (map.getLayer('label-kota')) map.setLayoutProperty('label-kota', 'visibility', 'none');

        // Highlight polygon kecamatan di kota tsb
        if (map.getLayer('polygon-active')) {
            map.setFilter('polygon-active', cityFilter);
        }
    }
    // ----------------------------------------------------
    // CASE 2: KOTA & KECAMATAN TERPILIH (Tampilkan 1 Titik Oren Spesifik)
    // ----------------------------------------------------
    else if (filterState.city !== 'all' && filterState.district !== 'all') {
        const districtFilter = ['==', ['get', 'district'], filterState.district];

        map.setLayoutProperty('titik-kecamatan', 'visibility', 'visible');
        map.setFilter('titik-kecamatan', districtFilter);

        if (map.getLayer('label-kecamatan')) {
            map.setLayoutProperty('label-kecamatan', 'visibility', 'visible');
            map.setFilter('label-kecamatan', districtFilter);
        }

        if (map.getLayer('polygon-active')) {
            map.setFilter('polygon-active', districtFilter);
        }
    }
    // ----------------------------------------------------
    // CASE 3: RESET "SEMUA WILAYAH"
    // ----------------------------------------------------
    else {
        // Sembunyikan titik kecamatan
        map.setLayoutProperty('titik-kecamatan', 'visibility', 'none');
        if (map.getLayer('label-kecamatan')) map.setLayoutProperty('label-kecamatan', 'visibility', 'none');

        // Tampilkan kembali titik merah kota
        if (map.getLayer('titik-kota')) map.setLayoutProperty('titik-kota', 'visibility', 'visible');
        if (map.getLayer('label-kota')) map.setLayoutProperty('label-kota', 'visibility', 'visible');

        // Reset polygon highlight
        if (map.getLayer('polygon-active')) {
            map.setFilter('polygon-active', ['==', ['get', 'district'], '___NO_SELECTION___']);
        }
    }
}


// 4. Event Listener Form Filter
document.addEventListener('DOMContentLoaded', () => {
    populateCityDropdown();

    // Event saat Kota dipilih
    document.getElementById('filter-city')?.addEventListener('change', async (e) => {
        const select = e.target;
        const selectedOption = select.options[select.selectedIndex];

        filterState.city = select.value;
        filterState.district = 'all';

        await populateDistrictDropdown(filterState.city);

        // Langsung zoom ke koordinat dari database!
        const lng = parseFloat(selectedOption.dataset.lng);
        const lat = parseFloat(selectedOption.dataset.lat);

        if (!isNaN(lng) && !isNaN(lat)) {
            const targetZoom = filterState.city === 'all' ? 5 : 10;
            map.flyTo({ center: [lng, lat], zoom: targetZoom, duration: 1300 });
        }

        applyFilters();
    });

    // Event saat Kecamatan dipilih
    document.getElementById('filter-district')?.addEventListener('change', (e) => {
        const select = e.target;
        const selectedOption = select.options[select.selectedIndex];

        filterState.district = select.value;

        const lng = parseFloat(selectedOption.dataset.lng);
        const lat = parseFloat(selectedOption.dataset.lat);

        if (!isNaN(lng) && !isNaN(lat)) {
            const targetZoom = filterState.district === 'all' ? 10 : 12;
            map.flyTo({ center: [lng, lat], zoom: targetZoom, duration: 1200 });
        }

        applyFilters();
    });
});

if (typeof map !== 'undefined') {
    map.on('load', () => {
        setTimeout(applyFilters, 500);
    });
}