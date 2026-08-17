/**
 * Ambil & render prakiraan cuaca BMKG untuk sebuah kecamatan.
 * Dipanggil dari insight.js setiap kali panel insight diisi ulang.
 */
async function fetchWeather(districtId) {
    const loadingEl = document.getElementById('weather-loading');
    const emptyEl = document.getElementById('weather-empty');
    const contentEl = document.getElementById('weather-content');
    if (!loadingEl || !emptyEl || !contentEl) return;

    loadingEl.style.display = 'block';
    loadingEl.textContent = 'Memuat data cuaca...';
    emptyEl.style.display = 'none';
    contentEl.style.display = 'none';

    if (!districtId) {
        loadingEl.style.display = 'none';
        emptyEl.style.display = 'block';
        emptyEl.textContent = 'Pilih kecamatan untuk melihat cuaca.';
        return;
    }

    try {
        const response = await fetch(`/api/weather/forecast?districtId=${encodeURIComponent(districtId)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (!data.resolved || !data.current) {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
            emptyEl.textContent = data.message || 'Data cuaca tidak tersedia untuk wilayah ini.';
            return;
        }

        renderWeather(data);
        loadingEl.style.display = 'none';
        contentEl.style.display = 'flex';
    } catch (err) {
        console.error('Error fetchWeather:', err);
        loadingEl.style.display = 'none';
        emptyEl.style.display = 'block';
        emptyEl.textContent = 'Gagal memuat data cuaca dari BMKG.';
    }
}

function renderWeather(data) {
    const current = data.current;

    const iconEl = document.getElementById('weather-icon');
    if (iconEl) {
        iconEl.src = current.image || '';
        iconEl.alt = current.weather_desc || '';
    }

    const tempEl = document.getElementById('weather-temp');
    if (tempEl) tempEl.textContent = `${Math.round(current.t)}°C`;

    const descEl = document.getElementById('weather-desc');
    if (descEl) descEl.textContent = current.weather_desc || '-';

    const huEl = document.getElementById('weather-hu');
    if (huEl) huEl.textContent = `${current.hu}%`;

    const windEl = document.getElementById('weather-wind');
    if (windEl) windEl.textContent = `${Math.round(current.ws)} km/j${current.wd ? ' (' + current.wd + ')' : ''}`;

    const vsEl = document.getElementById('weather-vs');
    if (vsEl) vsEl.textContent = current.vs_text || '-';

    const locEl = document.getElementById('weather-location');
    if (locEl) {
        locEl.textContent = `Prakiraan mewakili Kel./Desa ${data.desa}, ${data.kecamatan} — sumber: BMKG`;
    }

    const stripEl = document.getElementById('weather-strip');
    if (stripEl && Array.isArray(data.forecast)) {
        stripEl.innerHTML = data.forecast.slice(0, 8).map(f => {
            const parsed = new Date((f.local_datetime || '').replace(' ', 'T'));
            const hh = isNaN(parsed.getTime()) ? '-' : String(parsed.getHours()).padStart(2, '0') + ':00';
            return `<div class="weather-strip-item">
                <span class="ws-time">${hh}</span>
                <img src="${f.image || ''}" alt="${f.weather_desc || ''}" />
                <span class="ws-temp">${Math.round(f.t)}°</span>
            </div>`;
        }).join('');
    }
}
