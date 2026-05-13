// =====================================================================
// Kenya administrative geography (IEBC delimitation).
// Currently seeded for Nairobi (47) and Kiambu (22) counties.
// Add additional counties here as the platform expands.
// =====================================================================

export type KenyaConstituency = {
  name: string;
  wards: readonly string[];
};

export type KenyaCounty = {
  /** IEBC numeric county code. */
  code: number;
  name: string;
  constituencies: readonly KenyaConstituency[];
};

export const KENYA_COUNTIES: readonly KenyaCounty[] = [
  {
    code: 47,
    name: "Nairobi",
    constituencies: [
      {
        name: "Westlands",
        wards: [
          "Kitisuru",
          "Parklands/Highridge",
          "Karura",
          "Kangemi",
          "Mountain View",
        ],
      },
      {
        name: "Dagoretti North",
        wards: ["Kilimani", "Kawangware", "Gatina", "Kileleshwa", "Kabiro"],
      },
      {
        name: "Dagoretti South",
        wards: ["Mutu-ini", "Ngando", "Riruta", "Uthiru/Ruthimitu", "Waithaka"],
      },
      {
        name: "Langata",
        wards: [
          "Karen",
          "Nairobi West",
          "Mugumu-ini",
          "South C",
          "Nyayo Highrise",
        ],
      },
      {
        name: "Kibra",
        wards: [
          "Laini Saba",
          "Lindi",
          "Makina",
          "Woodley/Kenyatta Golf Course",
          "Sarang'ombe",
        ],
      },
      {
        name: "Roysambu",
        wards: [
          "Roysambu",
          "Garden Estate",
          "Ridgeways",
          "Githurai",
          "Kahawa West",
        ],
      },
      {
        name: "Kasarani",
        wards: ["Clay City", "Mwiki", "Kasarani", "Njiru", "Ruai"],
      },
      {
        name: "Ruaraka",
        wards: [
          "Baba Dogo",
          "Utalii",
          "Mathare North",
          "Lucky Summer",
          "Korogocho",
        ],
      },
      {
        name: "Embakasi South",
        wards: ["Imara Daima", "Kwa Njenga", "Kwa Reuben", "Pipeline", "Kware"],
      },
      {
        name: "Embakasi North",
        wards: [
          "Kariobangi North",
          "Dandora Area I",
          "Dandora Area II",
          "Dandora Area III",
          "Dandora Area IV",
        ],
      },
      {
        name: "Embakasi Central",
        wards: [
          "Kayole North",
          "Kayole Central",
          "Kayole South",
          "Komarock",
          "Matopeni/Spring Valley",
        ],
      },
      {
        name: "Embakasi East",
        wards: [
          "Upper Savanna",
          "Lower Savanna",
          "Embakasi",
          "Utawala",
          "Mihango",
        ],
      },
      {
        name: "Embakasi West",
        wards: ["Umoja I", "Umoja II", "Mowlem", "Kariobangi South"],
      },
      {
        name: "Makadara",
        wards: ["Maringo/Hamza", "Viwandani", "Harambee", "Makongeni"],
      },
      {
        name: "Kamukunji",
        wards: [
          "Pumwani",
          "Eastleigh North",
          "Eastleigh South",
          "Airbase",
          "California",
        ],
      },
      {
        name: "Starehe",
        wards: [
          "Nairobi Central",
          "Ngara",
          "Ziwani/Kariokor",
          "Pangani",
          "Landimawe",
          "Nairobi South",
        ],
      },
      {
        name: "Mathare",
        wards: [
          "Hospital",
          "Mabatini",
          "Huruma",
          "Ngei",
          "Mlango Kubwa",
          "Kiamaiko",
        ],
      },
    ],
  },
  {
    code: 22,
    name: "Kiambu",
    constituencies: [
      {
        name: "Gatundu South",
        wards: ["Kiamwangi", "Kiganjo", "Ndarugu", "Ngenda"],
      },
      {
        name: "Gatundu North",
        wards: ["Gituamba", "Githobokoni", "Chania", "Mang'u"],
      },
      {
        name: "Juja",
        wards: ["Murera", "Theta", "Juja", "Witeithie", "Kalimoni"],
      },
      {
        name: "Thika Town",
        wards: ["Township", "Kamenu", "Hospital", "Gatuanyaga", "Ngoliba"],
      },
      {
        name: "Ruiru",
        wards: [
          "Gitothua",
          "Biashara",
          "Gatongora",
          "Kahawa Sukari",
          "Kahawa Wendani",
          "Kiuu",
          "Mwiki",
          "Mwihoko",
        ],
      },
      {
        name: "Githunguri",
        wards: ["Githunguri", "Githiga", "Ikinu", "Ngewa", "Komothai"],
      },
      {
        name: "Kiambu",
        wards: ["Tinganga", "Township (Kiambu)", "Ndumberi", "Riabai"],
      },
      {
        name: "Kiambaa",
        wards: ["Cianda", "Karuri", "Ndenderu", "Muchatha", "Kihara"],
      },
      {
        name: "Kabete",
        wards: ["Gitaru", "Muguga", "Nyadhuna", "Kabete", "Uthiru"],
      },
      {
        name: "Kikuyu",
        wards: ["Karai", "Nachu", "Sigona", "Kikuyu", "Kinoo"],
      },
      {
        name: "Limuru",
        wards: [
          "Bibirioni",
          "Limuru Central",
          "Ndeiya",
          "Limuru East",
          "Ngecha-Tigoni",
        ],
      },
      {
        name: "Lari",
        wards: ["Kinale", "Kijabe", "Nyanduma", "Kamburu", "Lari/Kirenga"],
      },
    ],
  },
] as const;

export const KENYA_COUNTY_NAMES = KENYA_COUNTIES.map((c) => c.name);

export function findCounty(name: string): KenyaCounty | undefined {
  return KENYA_COUNTIES.find((c) => c.name === name);
}

export function findConstituency(
  countyName: string,
  constituencyName: string,
): KenyaConstituency | undefined {
  return findCounty(countyName)?.constituencies.find(
    (c) => c.name === constituencyName,
  );
}
