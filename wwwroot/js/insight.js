let genderChartInstance = null;
let pyramidChartInstance = null;

/**
 * Update Panel Insight secara menyeluruh
 */
/**
 * Update Panel Insight secara menyeluruh
 */
function updateInsightPanel(data) {
    if (!data) return;

    // Switch Keterangan Awal -> Tampilan Konten
    const emptyState = document.getElementById('insight-empty-state');
    const contentState = document.getElementById('insight-content-state');

    if (emptyState) emptyState.style.display = 'none';
    if (contentState) contentState.style.display = 'block';

    // 2. UPDATE NAMA KECAMATAN
    const districtElem = document.getElementById('insight-district-name');
    if (districtElem) {
        districtElem.textContent = data.district || data.District || "Kecamatan";
    }

    // 3. UPDATE TOTAL PENDUDUK
    const male = Number(data.male_count ?? data.maleCount ?? 0);
    const female = Number(data.female_count ?? data.femaleCount ?? 0);
    const totalPop = Number(data.total_population ?? data.totalPopulation ?? (male + female));

    const totalPopElem = document.getElementById('stat-total-pop');
    if (totalPopElem) {
        if (totalPop > 0) {
            totalPopElem.textContent = new Intl.NumberFormat('id-ID').format(totalPop);
            totalPopElem.style.fontSize = ""; // Reset font size jika sebelumnya diubah
        } else {
            totalPopElem.textContent = "Data belum tersedia";
            totalPopElem.style.fontSize = "1.1rem";
        }
    }

    // 4. RENDER DONUT CHART GENDER
    renderGenderDonut(male, female, totalPop);

    // 5. RENDER PIRAMIDA USIA
    renderAgePyramid(data);

    // 6. AMBIL & RENDER CUACA (BMKG)
    const districtId = data.district_id || data.DistrictId || data.districtId;
    if (typeof fetchWeather === 'function') {
        fetchWeather(districtId);
    }
}
/**
 * Render Donut Chart Gender (Handled jika data 0)
 */
function renderGenderDonut(male, female, total) {
    const canvas = document.getElementById('genderDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (genderChartInstance) genderChartInstance.destroy();

    // JIKA DATA KOSONG (0 / NULL) -> Tampilkan Chart Kosong / Netral
    if (total <= 0) {
        genderChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Data Belum Tersedia'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { enabled: false }
                },
                cutout: '65%'
            }
        });
        return;
    }

    // JIKA DATA ADA -> Render seperti biasa
    const malePct = ((male / total) * 100).toFixed(1);
    const femalePct = ((female / total) * 100).toFixed(1);

    genderChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
                `Laki-laki (${malePct}% - ${new Intl.NumberFormat('id-ID').format(male)} jiwa)`,
                `Perempuan (${femalePct}% - ${new Intl.NumberFormat('id-ID').format(female)} jiwa)`
            ],
            datasets: [{
                data: [male, female],
                backgroundColor: ['#3b82f6', '#ec4899'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 10, family: 'Plus Jakarta Sans' }, boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const val = context.raw;
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${new Intl.NumberFormat('id-ID').format(val)} jiwa (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

/**
 * Render Piramida Usia (Handled jika seluruh age bernilai 0)
 */
function renderAgePyramid(data) {
    const canvas = document.getElementById('agePyramidChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (pyramidChartInstance) pyramidChartInstance.destroy();

    const ageLabels = [
        '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
        '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75+'
    ];

    // Data Laki-laki
    const maleValues = [
        -(data.age_0_4_m || 0), -(data.age_5_9_m || 0), -(data.age_10_14_m || 0), -(data.age_15_19_m || 0),
        -(data.age_20_24_m || 0), -(data.age_25_29_m || 0), -(data.age_30_34_m || 0), -(data.age_35_39_m || 0),
        -(data.age_40_44_m || 0), -(data.age_45_49_m || 0), -(data.age_50_54_m || 0), -(data.age_55_59_m || 0),
        -(data.age_60_64_m || 0), -(data.age_65_69_m || 0), -(data.age_70_74_m || 0), -(data.age_75_plus_m || 0)
    ];

    // Data Perempuan
    const femaleValues = [
        (data.age_0_4_f || 0), (data.age_5_9_f || 0), (data.age_10_14_f || 0), (data.age_15_19_f || 0),
        (data.age_20_24_f || 0), (data.age_25_29_f || 0), (data.age_30_34_f || 0), (data.age_35_39_f || 0),
        (data.age_40_44_f || 0), (data.age_45_49_f || 0), (data.age_50_54_f || 0), (data.age_55_59_f || 0),
        (data.age_60_64_f || 0), (data.age_65_69_f || 0), (data.age_70_74_f || 0), (data.age_75_plus_f || 0)
    ];

    // Cek apakah seluruh data kelompok usia bernilai 0
    const isAgeDataEmpty = maleValues.every(v => v === 0) && femaleValues.every(v => v === 0);

    pyramidChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ageLabels,
            datasets: [
                {
                    label: 'Laki-laki',
                    data: maleValues,
                    backgroundColor: '#3b82f6',
                    borderRadius: 3
                },
                {
                    label: 'Perempuan',
                    data: femaleValues,
                    backgroundColor: '#ec4899',
                    borderRadius: 3
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        font: { size: 9 },
                        callback: (val) => new Intl.NumberFormat('id-ID').format(Math.abs(val))
                    }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { size: 9, weight: '600' } }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 10, font: { size: 10 } }
                },
                subtitle: {
                    display: isAgeDataEmpty,
                    text: 'Data kelompok usia belum tersedia',
                    color: '#94a3b8',
                    font: { size: 11, style: 'italic' },
                    padding: { bottom: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const val = Math.abs(context.raw);
                            return ` ${context.dataset.label}: ${new Intl.NumberFormat('id-ID').format(val)} jiwa`;
                        }
                    }
                }
            }
        }
    });
}