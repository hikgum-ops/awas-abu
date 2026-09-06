export type Area = {
  code: string;
  name: string;
  regency: string;
  province: string;
  lat: number;
  lng: number;
  aliases: string[];
};

export const VENT = { lat: -6.102, lng: 105.423 };
export const MAX_MATCH_KM = 25;

/**
 * Phase 0 coverage is bundled so area detection still works when the live
 * status database is unavailable. These are public kecamatan centre points,
 * never a visitor's GPS coordinates.
 */
export const BUILT_IN_AREAS: Area[] = [
  { code: "BTN-SRG-CNK", name: "Cinangka", regency: "Kab. Serang", province: "Banten", lat: -6.2833, lng: 105.8333, aliases: ["cinangka", "pasauran", "karangbolong"] },
  { code: "BTN-SRG-ANY", name: "Anyar", regency: "Kab. Serang", province: "Banten", lat: -6.0833, lng: 105.9, aliases: ["anyar", "anyer"] },
  { code: "BTN-SRG-BJN", name: "Bojonegara", regency: "Kab. Serang", province: "Banten", lat: -5.9333, lng: 106.0833, aliases: ["bojonegara"] },
  { code: "BTN-SRG-PAM", name: "Pulo Ampel", regency: "Kab. Serang", province: "Banten", lat: -5.9, lng: 106.05, aliases: ["pulo ampel", "puloampel"] },
  { code: "BTN-PDG-CRT", name: "Carita", regency: "Kab. Pandeglang", province: "Banten", lat: -6.3167, lng: 105.8333, aliases: ["carita"] },
  { code: "BTN-PDG-LBN", name: "Labuan", regency: "Kab. Pandeglang", province: "Banten", lat: -6.3833, lng: 105.8333, aliases: ["labuan"] },
  { code: "BTN-PDG-PNB", name: "Panimbang", regency: "Kab. Pandeglang", province: "Banten", lat: -6.4667, lng: 105.6667, aliases: ["panimbang", "tanjung lesung"] },
  { code: "BTN-PDG-SMR", name: "Sumur", regency: "Kab. Pandeglang", province: "Banten", lat: -6.65, lng: 105.5, aliases: ["sumur", "ujung kulon"] },
  { code: "BTN-PDG-CGL", name: "Cigeulis", regency: "Kab. Pandeglang", province: "Banten", lat: -6.55, lng: 105.6167, aliases: ["cigeulis"] },
  { code: "BTN-PDG-SKR", name: "Sukaresmi", regency: "Kab. Pandeglang", province: "Banten", lat: -6.4, lng: 105.85, aliases: ["sukaresmi"] },
  { code: "BTN-CLG-KOT", name: "Kota Cilegon", regency: "Kota Cilegon", province: "Banten", lat: -6.0167, lng: 106.0167, aliases: ["cilegon", "merak"] },
  { code: "BTN-SRG-KOT", name: "Kota Serang", regency: "Kota Serang", province: "Banten", lat: -6.12, lng: 106.15, aliases: ["kota serang", "serang"] },
  { code: "LPG-LSL-KLD", name: "Kalianda", regency: "Kab. Lampung Selatan", province: "Lampung", lat: -5.75, lng: 105.5833, aliases: ["kalianda"] },
  { code: "LPG-LSL-RJB", name: "Rajabasa", regency: "Kab. Lampung Selatan", province: "Lampung", lat: -5.8, lng: 105.65, aliases: ["rajabasa", "canti", "kunjir"] },
  { code: "LPG-LSL-BKH", name: "Bakauheni", regency: "Kab. Lampung Selatan", province: "Lampung", lat: -5.8667, lng: 105.75, aliases: ["bakauheni"] },
  { code: "LPG-LSL-PNH", name: "Penengahan", regency: "Kab. Lampung Selatan", province: "Lampung", lat: -5.7333, lng: 105.6667, aliases: ["penengahan"] },
  { code: "LPG-LSL-KTB", name: "Katibung", regency: "Kab. Lampung Selatan", province: "Lampung", lat: -5.5667, lng: 105.4333, aliases: ["katibung"] },
  { code: "LPG-LSL-SDM", name: "Sidomulyo", regency: "Kab. Lampung Selatan", province: "Lampung", lat: -5.6167, lng: 105.55, aliases: ["sidomulyo"] },
  { code: "LPG-BDL-PJG", name: "Panjang", regency: "Kota Bandar Lampung", province: "Lampung", lat: -5.4667, lng: 105.3167, aliases: ["panjang"] },
  { code: "LPG-BDL-KOT", name: "Bandar Lampung", regency: "Kota Bandar Lampung", province: "Lampung", lat: -5.4292, lng: 105.261, aliases: ["bandar lampung", "tanjung karang", "teluk betung"] },
  { code: "JKT-KOT-DKI", name: "DKI Jakarta", regency: "DKI Jakarta", province: "DKI Jakarta", lat: -6.2, lng: 106.8167, aliases: ["jakarta", "jakarta pusat", "jakarta selatan", "jakarta barat", "jakarta timur", "jakarta utara", "jabodetabek"] },
];

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const radiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

export function clearAreaCache(): void {
  // Retained for compatibility with existing tests and callers.
}

export async function loadAreas(): Promise<Area[]> {
  return BUILT_IN_AREAS;
}

export async function areaByCoords(
  lat: number,
  lng: number,
): Promise<{ area: Area; km: number } | null> {
  const areas = await loadAreas();
  let best: { area: Area; km: number } | null = null;

  for (const area of areas) {
    const km = haversineKm({ lat, lng }, area);
    if (!best || km < best.km) best = { area, km };
  }
  return best && best.km <= MAX_MATCH_KM ? best : null;
}

export function normaliseAreaName(value: string): string {
  return value
    .toLowerCase()
    .replace(/^(kec\.?|kecamatan|kab\.?|kabupaten|kota)\s+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findAreaByName(areas: Area[], raw: string): Area | null {
  const query = normaliseAreaName(raw);
  if (query.length < 3) return null;

  for (const area of areas) {
    if (normaliseAreaName(area.name) === query) return area;
    if (area.aliases.some((alias) => normaliseAreaName(alias) === query)) {
      return area;
    }
  }

  const partial = areas.filter(
    (area) =>
      normaliseAreaName(area.name).includes(query) ||
      area.aliases.some((alias) => normaliseAreaName(alias).includes(query)),
  );
  return partial.length === 1 ? partial[0] : null;
}

export async function areaByName(raw: string): Promise<Area | null> {
  return findAreaByName(await loadAreas(), raw);
}

export async function areaByCode(code: string): Promise<Area | null> {
  return (await loadAreas()).find((area) => area.code === code) ?? null;
}

export function distanceToVentKm(area: Area): number {
  return haversineKm(area, VENT);
}
