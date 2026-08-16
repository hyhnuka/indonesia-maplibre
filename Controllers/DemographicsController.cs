using Dapper;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using SpatialDashboard.Models;

namespace SpatialDashboard.Controllers
{
    [ApiController]
    [Route("api/demographics")]
    public class DemographicsApiController : ControllerBase
    {
        private readonly string _connectionString;

        public DemographicsApiController(IConfiguration configuration)
        {
            // Ambil Connection String dari appsettings.json
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? "Host=localhost;Port=5432;Database=ooh_gis;Username=postgres;Password=postgres";
        }

        // ==============================================================================
        // 1. GET: /api/demographicsapi/regencies
        // Digunakan untuk mengisi dropdown "Kota / Kabupaten" di Filter Panel
        // ==============================================================================
        [HttpGet("regencies")]
        public async Task<IActionResult> GetRegencies()
        {
            using var conn = new NpgsqlConnection(_connectionString);
            string sql = @"
                SELECT DISTINCT regency 
                FROM district_demographics 
                ORDER BY regency ASC;";

            var regencies = await conn.QueryAsync<string>(sql);
            return Ok(regencies);
        }

        // ==============================================================================
        // 2. GET: /api/demographicsapi/districts?regencyName=Kota%20Surabaya
        // Digunakan untuk mengisi dropdown "Kecamatan" berdasarkan Kota yang dipilih
        // ==============================================================================
        [HttpGet("districts")]
        public async Task<IActionResult> GetDistricts([FromQuery] string? regencyName)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            string sql = @"
                SELECT district_id AS DistrictId, district AS District 
                FROM district_demographics 
                WHERE (@RegencyName IS NULL OR regency = @RegencyName)
                ORDER BY district ASC;";

            var districts = await conn.QueryAsync<dynamic>(sql, new { RegencyName = regencyName });
            return Ok(districts);
        }

        // ==============================================================================
        // 3. GET: /api/demographicsapi/detail/{districtId}
        // Digunakan oleh insight.js saat kecamatan diklik pada peta
        // ==============================================================================
        [HttpGet("detail/{districtId}")]
        public async Task<IActionResult> GetDistrictDetail(string districtId)
        {
            using var conn = new NpgsqlConnection(_connectionString);

            // Query murni tanpa alias 'AS' agar nama kolom sama persis dengan DB
            string sql = @"
            SELECT 
                district_id, regency_id, district, regency,
                male_count, female_count, total_population,
                age_0_4_m, age_5_9_m, age_10_14_m, age_15_19_m, age_20_24_m, age_25_29_m, age_30_34_m, age_35_39_m,
                age_40_44_m, age_45_49_m, age_50_54_m, age_55_59_m, age_60_64_m, age_65_69_m, age_70_74_m, age_75plus_m,
                age_0_4_f, age_5_9_f, age_10_14_f, age_15_19_f, age_20_24_f, age_25_29_f, age_30_34_f, age_35_39_f,
                age_40_44_f, age_45_49_f, age_50_54_f, age_55_59_f, age_60_64_f, age_65_69_f, age_70_74_f, age_75plus_f
            FROM district_demographics
            WHERE district_id = @DistrictId;";

            var detail = await conn.QueryFirstOrDefaultAsync<dynamic>(sql, new { DistrictId = districtId });

            if (detail == null)
                return NotFound(new { message = "Data kecamatan tidak ditemukan" });

            return Ok(detail);
        }
        // ==============================================================================
        // 4. GET: /api/demographicsapi/geojson?regencyName=Kota%20Surabaya
        // Menghasilkan GeoJSON Spasial + Atribut Demografi langsung dari PostGIS untuk MapLibre
        // ==============================================================================
        [HttpGet("geojson")]
        public async Task<IActionResult> GetMapGeoJson([FromQuery] string? regencyName)
        {
            using var conn = new NpgsqlConnection(_connectionString);

            // PostGIS Query: Merubah Geometri Vektor & Data Demografi langsung jadi JSON FeatureCollection
            string sql = @"
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', jsonb_agg(
                        jsonb_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJSON(m.geom)::jsonb,
                            'properties', jsonb_build_object(
                                'district_id', d.district_id,
                                'district', d.district,
                                'regency', d.regency,
                                'total_population', d.total_population,
                                'male_count', d.male_count,
                                'female_count', d.female_count
                            )
                        )
                    )
                )
                FROM indonesia_map m
                INNER JOIN district_demographics d ON m.district_id = d.district_id
                WHERE (@RegencyName IS NULL OR d.regency = @RegencyName);";

            var geoJsonString = await conn.ExecuteScalarAsync<string>(sql, new { RegencyName = regencyName });

            if (string.IsNullOrEmpty(geoJsonString))
                return Ok("{\"type\": \"FeatureCollection\", \"features\": []}");

            return Content(geoJsonString, "application/json");
        }

        // ==============================================================================
        // 5. GET: /api/demographics/all
        // Digunakan oleh map.js untuk pewarnaan Choropleth Peta (Seluruh Kecamatan)
        // ==============================================================================
        [HttpGet("all")]
        public async Task<IActionResult> GetAllDemographics([FromQuery] string? regencyName)
        {
            using var conn = new NpgsqlConnection(_connectionString);

            // Cek apakah parameter regencyName dikirim dan bukan "all"
            bool hasFilter = !string.IsNullOrWhiteSpace(regencyName) &&
                             !regencyName.Equals("all", StringComparison.OrdinalIgnoreCase);

            string sql = @"
            SELECT 
                district_id, 
                district, 
                regency, 
                male_count, 
                female_count, 
                total_population,
                age_0_4_m, age_5_9_m, age_10_14_m, age_15_19_m, age_20_24_m, age_25_29_m, age_30_34_m, age_35_39_m,
                age_40_44_m, age_45_49_m, age_50_54_m, age_55_59_m, age_60_64_m, age_65_69_m, age_70_74_m, age_75plus_m,
                age_0_4_f, age_5_9_f, age_10_14_f, age_15_19_f, age_20_24_f, age_25_29_f, age_30_34_f, age_35_39_f,
                age_40_44_f, age_45_49_f, age_50_54_f, age_55_59_f, age_60_64_f, age_65_69_f, age_70_74_f, age_75plus_f
            FROM district_demographics
            WHERE (@HasFilter = FALSE OR LOWER(TRIM(regency)) = LOWER(TRIM(@RegencyName)));";

            var data = await conn.QueryAsync<dynamic>(sql, new
            {
                HasFilter = hasFilter,
                RegencyName = regencyName?.Trim()
            });

            return Ok(data);
        }
    }
}