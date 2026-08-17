using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Npgsql;
using map_libre.Models;

namespace map_libre.Controllers
{
    // Menyediakan prakiraan cuaca BMKG per kecamatan.
    // Data kita hanya menyimpan kode wilayah level kecamatan (kode BPS),
    // sedangkan BMKG butuh kode adm4 (level kelurahan/desa, kode Kemendagri).
    // Resolusi dilakukan lewat pencocokan nama wilayah ke wilayah.id, lalu di-cache.
    [ApiController]
    [Route("api/weather")]
    public class WeatherController : ControllerBase
    {
        private const string WilayahBaseUrl = "https://wilayah.id/api";
        private const string BmkgBaseUrl = "https://api.bmkg.go.id/publik/prakiraan-cuaca";

        private readonly string _connectionString;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;

        public WeatherController(IConfiguration configuration, IHttpClientFactory httpClientFactory, IMemoryCache cache)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? "Host=localhost;Port=5432;Database=ooh_gis;Username=postgres;Password=postgres";
            _httpClientFactory = httpClientFactory;
            _cache = cache;
        }

        // GET /api/weather/forecast?districtId=3273010
        [HttpGet("forecast")]
        public async Task<IActionResult> GetForecast([FromQuery] string districtId)
        {
            if (string.IsNullOrWhiteSpace(districtId))
                return BadRequest(new { message = "Param districtId wajib diisi" });

            using var conn = new NpgsqlConnection(_connectionString);
            var district = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT district, regency FROM district_demographics WHERE district_id = @DistrictId",
                new { DistrictId = districtId });

            if (district == null)
                return NotFound(new { message = "Kecamatan tidak ditemukan" });

            string districtName = district.district;
            string regencyName = district.regency;

            var adm4Info = await ResolveAdm4Async(districtId, regencyName, districtName);
            if (adm4Info == null)
            {
                return Ok(new
                {
                    resolved = false,
                    message = $"Kode wilayah BMKG tidak ditemukan untuk kecamatan '{districtName}', {regencyName}."
                });
            }

            var httpClient = _httpClientFactory.CreateClient();
            BmkgResponse? bmkg;
            try
            {
                bmkg = await httpClient.GetFromJsonAsync<BmkgResponse>($"{BmkgBaseUrl}?adm4={adm4Info.Value.Adm4}");
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { resolved = false, message = "Gagal mengambil data cuaca dari BMKG", detail = ex.Message });
            }

            var flat = bmkg?.Data?.FirstOrDefault()?.Cuaca?
                .SelectMany(day => day)
                .OrderBy(f => f.LocalDatetime, StringComparer.Ordinal)
                .ToList() ?? new List<BmkgForecastItem>();

            if (flat.Count == 0)
            {
                return Ok(new
                {
                    resolved = false,
                    message = "BMKG tidak mengembalikan data prakiraan untuk wilayah ini."
                });
            }

            return Ok(new
            {
                resolved = true,
                provinsi = bmkg?.Lokasi?.Provinsi,
                kotkab = bmkg?.Lokasi?.Kotkab,
                kecamatan = districtName,
                desa = adm4Info.Value.VillageName,
                adm4 = adm4Info.Value.Adm4,
                lat = bmkg?.Lokasi?.Lat,
                lon = bmkg?.Lokasi?.Lon,
                current = flat.FirstOrDefault(),
                forecast = flat.Take(16)
            });
        }

        private async Task<(string Adm4, string VillageName)?> ResolveAdm4Async(string districtId, string regencyName, string districtName)
        {
            var cacheKey = $"weather:adm4:{districtId}";
            if (_cache.TryGetValue(cacheKey, out (string Adm4, string VillageName) cached))
                return cached;

            var httpClient = _httpClientFactory.CreateClient();

            var allRegencies = await _cache.GetOrCreateAsync("weather:all-regencies", async entry =>
            {
                entry.SlidingExpiration = TimeSpan.FromHours(12);

                var list = new List<WilayahItem>();
                var provincesResp = await httpClient.GetFromJsonAsync<WilayahListResponse<WilayahItem>>($"{WilayahBaseUrl}/provinces.json");
                if (provincesResp?.Data == null) return list;

                var tasks = provincesResp.Data.Select(async prov =>
                {
                    try
                    {
                        var regResp = await httpClient.GetFromJsonAsync<WilayahListResponse<WilayahItem>>($"{WilayahBaseUrl}/regencies/{prov.Code}.json");
                        return regResp?.Data ?? new List<WilayahItem>();
                    }
                    catch
                    {
                        return new List<WilayahItem>();
                    }
                });

                var results = await Task.WhenAll(tasks);
                foreach (var r in results) list.AddRange(r);
                return list;
            });

            var matchedRegency = FindBestMatch(allRegencies, regencyName, NormalizeRegency);
            if (matchedRegency == null) return null;

            var districtsResp = await httpClient.GetFromJsonAsync<WilayahListResponse<WilayahItem>>($"{WilayahBaseUrl}/districts/{matchedRegency.Code}.json");
            var matchedDistrict = FindBestMatch(districtsResp?.Data, districtName, NormalizeName);
            if (matchedDistrict == null) return null;

            var villagesResp = await httpClient.GetFromJsonAsync<WilayahListResponse<WilayahItem>>($"{WilayahBaseUrl}/villages/{matchedDistrict.Code}.json");
            var firstVillage = villagesResp?.Data?.FirstOrDefault();
            if (firstVillage == null) return null;

            var result = (Adm4: firstVillage.Code, VillageName: firstVillage.Name);
            _cache.Set(cacheKey, result, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(12) });
            return result;
        }

        // Coba cocokkan nama persis dulu, lalu fallback tanpa spasi
        // (menampung selisih ejaan antara kode BPS kita & kode Kemendagri di wilayah.id)
        private static WilayahItem? FindBestMatch(List<WilayahItem>? items, string targetName, Func<string, string> normalize)
        {
            if (items == null || items.Count == 0) return null;

            var target = normalize(targetName);
            var exact = items.FirstOrDefault(i => normalize(i.Name) == target);
            if (exact != null) return exact;

            var targetNoSpace = target.Replace(" ", "");
            return items.FirstOrDefault(i => normalize(i.Name).Replace(" ", "") == targetNoSpace);
        }

        private static string NormalizeName(string s) => s.Trim().ToLowerInvariant();

        private static string NormalizeRegency(string s) => NormalizeName(s)
            .Replace("kota administrasi", "kota")
            .Replace("kabupaten administrasi", "kabupaten");
    }
}
