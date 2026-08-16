using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Dapper;

namespace IndonesiaMapLibre.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MapController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public MapController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private NpgsqlConnection GetConnection()
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection")
                ?? "Host=localhost;Port=5432;Database=ooh_gis;Username=postgres;Password=postgres";
            return new NpgsqlConnection(connectionString);
        }

        // 1. GET /api/map/cities (Kirim nama kota + koordinat centroid + Bounding Box)
        [HttpGet("cities")]
        public async Task<IActionResult> GetCities()
        {
            using var conn = GetConnection();
            string sql = @"
            SELECT 
                regency,
                -- PointOnSurface menjamin titik selalu di daratan (bukan di laut)
                ST_X(ST_PointOnSurface(ST_Union(geom))) AS lng,
                ST_Y(ST_PointOnSurface(ST_Union(geom))) AS lat,
                ST_XMin(ST_Extent(geom)) AS min_lng,
                ST_YMin(ST_Extent(geom)) AS min_lat,
                ST_XMax(ST_Extent(geom)) AS max_lng,
                ST_YMax(ST_Extent(geom)) AS max_lat
            FROM indonesia_map 
            WHERE regency IS NOT NULL AND regency <> '' 
            GROUP BY regency
            ORDER BY regency;";

            var cities = await conn.QueryAsync(sql);
            return Ok(cities);
        }

        // 2. GET /api/map/districts?city=Gresik (Termasuk district_id)
        [HttpGet("districts")]
        public async Task<IActionResult> GetDistricts([FromQuery] string city)
        {
            if (string.IsNullOrWhiteSpace(city)) return BadRequest("Param city wajib diisi");

            using var conn = GetConnection();
            string sql = @"
            SELECT 
                TRIM(district_id) AS district_id,
                district,
                ST_X(ST_Centroid(ST_Union(geom))) AS lng,
                ST_Y(ST_Centroid(ST_Union(geom))) AS lat
            FROM indonesia_map 
            WHERE regency = @City 
              AND district IS NOT NULL 
              AND district <> '' 
            GROUP BY district_id, district
            ORDER BY district;";

            var districts = await conn.QueryAsync(sql, new { City = city });
            return Ok(districts);
        }
    }
}