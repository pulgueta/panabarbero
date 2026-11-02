import { colombia } from "@/config/colombia";
import type { GeoCoords } from "@/hooks/use-geolocation";

export interface ReverseGeocodeResult {
  departamento: string;
  /** Empty string when the department matched but the city couldn't be resolved. */
  ciudad: string;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function findCityAcrossDepartments(
  normalizedCity: string,
): ReverseGeocodeResult | null {
  if (!normalizedCity) return null;

  for (const department of colombia) {
    const city = department.ciudades.find(
      (name) => normalize(name) === normalizedCity,
    );
    if (city) {
      return { departamento: department.departamento, ciudad: city };
    }
  }
  return null;
}

/** Matches a raw department/city pair against the canonical `colombia.ts` list. */
export function matchColombia(
  rawDepartment: string,
  rawCity: string,
): ReverseGeocodeResult | null {
  const normalizedDep = normalize(rawDepartment);
  const normalizedCity = normalize(rawCity);

  const department =
    colombia.find((d) => normalize(d.departamento) === normalizedDep) ??
    colombia.find(
      (d) =>
        normalizedDep.length > 0 &&
        (normalize(d.departamento).includes(normalizedDep) ||
          normalizedDep.includes(normalize(d.departamento))),
    );

  if (department) {
    const city =
      department.ciudades.find((c) => normalize(c) === normalizedCity) ??
      department.ciudades.find(
        (c) =>
          normalizedCity.length > 0 &&
          (normalize(c).includes(normalizedCity) ||
            normalizedCity.includes(normalize(c))),
      );

    if (city) return { departamento: department.departamento, ciudad: city };

    // Department matched but city didn't — try a unique cross-department city
    // (handles e.g. Bogotá, whose subdivision name isn't a department).
    return (
      findCityAcrossDepartments(normalizedCity) ?? {
        departamento: department.departamento,
        ciudad: "",
      }
    );
  }

  // No department match (e.g. "Bogotá D.C.") — resolve by city alone.
  return findCityAcrossDepartments(normalizedCity);
}

/**
 * Keyless client-side reverse geocode (BigDataCloud) normalized against the
 * canonical Colombia dataset. Returns `null` outside Colombia or on failure;
 * the caller falls back to manual selection. The pin on the map lets the user
 * correct an imperfect match.
 */
export async function reverseGeocode(
  coords: GeoCoords,
): Promise<ReverseGeocodeResult | null> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lng}&localityLanguage=es`,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      countryCode?: string;
      principalSubdivision?: string;
      city?: string;
      locality?: string;
    };

    if (data.countryCode && data.countryCode !== "CO") return null;

    return matchColombia(
      data.principalSubdivision ?? "",
      data.city || data.locality || "",
    );
  } catch {
    return null;
  }
}
