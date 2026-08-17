using System.Text.Json.Serialization;

namespace map_libre.Models
{
    public class WilayahListResponse<T>
    {
        [JsonPropertyName("data")]
        public List<T> Data { get; set; } = new();
    }

    public class WilayahItem
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class BmkgResponse
    {
        [JsonPropertyName("lokasi")]
        public BmkgLokasi? Lokasi { get; set; }

        [JsonPropertyName("data")]
        public List<BmkgDataEntry> Data { get; set; } = new();
    }

    public class BmkgDataEntry
    {
        [JsonPropertyName("lokasi")]
        public BmkgLokasi? Lokasi { get; set; }

        [JsonPropertyName("cuaca")]
        public List<List<BmkgForecastItem>> Cuaca { get; set; } = new();
    }

    public class BmkgLokasi
    {
        [JsonPropertyName("adm4")]
        public string Adm4 { get; set; } = string.Empty;

        [JsonPropertyName("provinsi")]
        public string Provinsi { get; set; } = string.Empty;

        [JsonPropertyName("kotkab")]
        public string Kotkab { get; set; } = string.Empty;

        [JsonPropertyName("kecamatan")]
        public string Kecamatan { get; set; } = string.Empty;

        [JsonPropertyName("desa")]
        public string Desa { get; set; } = string.Empty;

        [JsonPropertyName("lon")]
        public double Lon { get; set; }

        [JsonPropertyName("lat")]
        public double Lat { get; set; }
    }

    public class BmkgForecastItem
    {
        [JsonPropertyName("local_datetime")]
        public string LocalDatetime { get; set; } = string.Empty;

        [JsonPropertyName("t")]
        public double T { get; set; }

        [JsonPropertyName("hu")]
        public int Hu { get; set; }

        [JsonPropertyName("weather_desc")]
        public string WeatherDesc { get; set; } = string.Empty;

        [JsonPropertyName("weather_desc_en")]
        public string WeatherDescEn { get; set; } = string.Empty;

        [JsonPropertyName("ws")]
        public double Ws { get; set; }

        [JsonPropertyName("wd")]
        public string Wd { get; set; } = string.Empty;

        [JsonPropertyName("tcc")]
        public int Tcc { get; set; }

        [JsonPropertyName("vs_text")]
        public string VsText { get; set; } = string.Empty;

        [JsonPropertyName("image")]
        public string Image { get; set; } = string.Empty;

        [JsonPropertyName("analysis_date")]
        public string AnalysisDate { get; set; } = string.Empty;
    }
}
