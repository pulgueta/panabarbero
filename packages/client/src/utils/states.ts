type StringLookup = Record<string, string>;

function normalizeForLookup(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_TO_CODE: StringLookup = {
  amazonas: "AMA",
  antioquia: "ANT",
  arauca: "ARA",
  atlantico: "ATL",
  bolivar: "BOL",
  boyaca: "BOY",
  caldas: "CAL",
  caqueta: "CAQ",
  casanare: "CAS",
  cauca: "CAU",
  cesar: "CES",
  choco: "CHO",
  cordoba: "COR",
  cundinamarca: "CUN",
  guainia: "GUA",
  guaviare: "GUV",
  huila: "HUI",
  "la guajira": "LAG",
  magdalena: "MAG",
  meta: "MET",
  narino: "NAR",
  "norte de santander": "NSA",
  putumayo: "PUT",
  quindio: "QUI",
  risaralda: "RIS",
  "san andres y providencia": "SAP",
  santander: "SAN",
  sucre: "SUC",
  tolima: "TOL",
  "valle del cauca": "VAC",
  vaupes: "VAU",
  vichada: "VID",
};

export type StateCode = (typeof NAME_TO_CODE)[keyof typeof NAME_TO_CODE];

export function getStateCode(stateName: string): StateCode | undefined {
  const key = normalizeForLookup(stateName);

  return NAME_TO_CODE[key] as StateCode | undefined;
}
