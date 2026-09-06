import { describe, expect, it } from "vitest";
import { BUILT_IN_AREAS } from "@/lib/awasabu/areas";
import { inferProvinceImpactAssumptions } from "@/lib/awasabu/impact-scope";

describe("province impact assumptions", () => {
  it("expands named provinces to every monitored area in each province", () => {
    const result = inferProvinceImpactAssumptions(
      "Sebaran mencakup Provinsi Banten dan Provinsi Lampung.",
      BUILT_IN_AREAS,
    );

    expect(result.map((item) => item.province)).toEqual(["Banten", "Lampung"]);
    expect(result[0].area_codes).toHaveLength(12);
    expect(result[1].area_codes).toHaveLength(8);
    expect(result.every((item) => item.basis === "province_mention_assumption")).toBe(true);
  });

  it("does not confuse Kabupaten Lampung Selatan with a province mention", () => {
    expect(
      inferProvinceImpactAssumptions(
        "Pos pengamatan berada di Kabupaten Lampung Selatan.",
        BUILT_IN_AREAS,
      ),
    ).toEqual([]);
  });

  it("does not treat a Jakarta publication dateline as DKI Jakarta impact", () => {
    expect(
      inferProvinceImpactAssumptions("Jakarta, 6 September 2026", BUILT_IN_AREAS),
    ).toEqual([]);
    expect(
      inferProvinceImpactAssumptions("Abu mencakup sebagian DKI Jakarta.", BUILT_IN_AREAS)[0]
        .province,
    ).toBe("DKI Jakarta");
  });
});
