namespace SpatialDashboard.Models
{
    public class DistrictDemographicsDto
    {
        public string DistrictId { get; set; } = string.Empty;
        public string RegencyId { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string Regency { get; set; } = string.Empty;

        public int MaleCount { get; set; }
        public int FemaleCount { get; set; }
        public int TotalPopulation { get; set; }

        // Kelompok Usia Laki-Laki (Male)
        public int Age04M { get; set; }
        public int Age59M { get; set; }
        public int Age1014M { get; set; }
        public int Age1519M { get; set; }
        public int Age2024M { get; set; }
        public int Age2529M { get; set; }
        public int Age3034M { get; set; }
        public int Age3539M { get; set; }
        public int Age4044M { get; set; }
        public int Age4549M { get; set; }
        public int Age5054M { get; set; }
        public int Age5559M { get; set; }
        public int Age6064M { get; set; }
        public int Age6569M { get; set; }
        public int Age7074M { get; set; }
        public int Age75PlusM { get; set; }

        // Kelompok Usia Perempuan (Female)
        public int Age04F { get; set; }
        public int Age59F { get; set; }
        public int Age1014F { get; set; }
        public int Age1519F { get; set; }
        public int Age2024F { get; set; }
        public int Age2529F { get; set; }
        public int Age3034F { get; set; }
        public int Age3539F { get; set; }
        public int Age4044F { get; set; }
        public int Age4549F { get; set; }
        public int Age5054F { get; set; }
        public int Age5559F { get; set; }
        public int Age6064F { get; set; }
        public int Age6569F { get; set; }
        public int Age7074F { get; set; }
        public int Age75PlusF { get; set; }
    }
}