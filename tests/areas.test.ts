import { describe, expect, it } from "vitest";
import {
  BUILT_IN_AREAS,
  findAreaByName,
  haversineKm,
  normaliseAreaName,
  type Area,
} from "@/lib/awasabu/areas";

const areas: Area[] = [
  {
    code: "BTN-SRG-CNK",
    name: "Cinangka",
    regency: "Kab. Serang",
    province: "Banten",
    lat: -6.2833,
    lng: 105.8333,
    aliases: ["Pasauran", "Karangbolong"],
  },
  {
    code: "BTN-SRG-KOT",
    name: "Kota Serang",
    regency: "Kota Serang",
    province: "Banten",
    lat: -6.12,
    lng: 106.15,
    aliases: ["Serang"],
  },
];

describe("area matching", () => {
  it("bundles the phase 0 area directory for GPS fallback", () => {
    expect(BUILT_IN_AREAS.map((area) => area.name)).toContain("Cinangka");
    expect(BUILT_IN_AREAS.map((area) => area.name)).toContain("Kalianda");
  });

  it("normalises Indonesian administrative prefixes", () => {
    expect(normaliseAreaName("Kec. Cinangka")).toBe("cinangka");
    expect(normaliseAreaName("Kecamatan  Cinangka")).toBe("cinangka");
  });

  it("matches an exact alias", () => {
    expect(findAreaByName(areas, "Pasauran")?.code).toBe("BTN-SRG-CNK");
  });

  it("refuses an ambiguous partial match", () => {
    expect(findAreaByName(areas, "ran")).toBeNull();
  });

  it("computes zero distance for the same point", () => {
    expect(haversineKm(areas[0], areas[0])).toBe(0);
  });
});
