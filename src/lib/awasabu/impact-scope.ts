import type { Area } from "./areas";

export const SCOPE_BASES = [
  "operator_selected",
  "explicit_area_mention",
  "province_mention_assumption",
  "geospatial_advisory",
] as const;

export type ScopeBasis = (typeof SCOPE_BASES)[number];

export type ProvinceImpactAssumption = {
  province: string;
  matched_term: string;
  area_codes: string[];
  basis: "province_mention_assumption";
};

const DIRECTIONAL_SUFFIXES = "selatan|timur|tengah|utara|barat";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function provincePattern(province: string): RegExp {
  if (province === "DKI Jakarta") return /\bdki\s+jakarta\b/i;
  if (province === "Lampung") {
    // "Lampung Selatan" names a regency, not necessarily the whole province.
    return new RegExp(`\\blampung\\b(?!\\s+(?:${DIRECTIONAL_SUFFIXES})\\b)`, "i");
  }
  return new RegExp(`\\b${escapeRegex(province).replace(/\s+/g, "\\s+")}\\b`, "i");
}

/**
 * Expands an explicit province-name mention to every area currently covered by
 * Awas Abu in that province. It does not establish observed ground-level ash.
 */
export function inferProvinceImpactAssumptions(
  sourceText: string,
  areas: readonly Pick<Area, "code" | "province">[],
): ProvinceImpactAssumption[] {
  if (!sourceText.trim()) return [];

  const provinces = [...new Set(areas.map((area) => area.province))];
  return provinces.flatMap((province) => {
    const match = sourceText.match(provincePattern(province));
    if (!match) return [];
    return [{
      province,
      matched_term: match[0],
      area_codes: areas
        .filter((area) => area.province === province)
        .map((area) => area.code),
      basis: "province_mention_assumption" as const,
    }];
  });
}
