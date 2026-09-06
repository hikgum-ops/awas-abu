import { describe, expect, it } from "vitest";
import { isOfficialSourceUrl, validateOperatorInput } from "@/lib/awasabu/operator-input";

const valid = {
  areas: ["BTN-SRG-CNK"],
  level: "AWAS_ABU",
  headline: "Hujan abu sedang berlangsung.",
  actions: ["Pakai masker"],
  source_name: "BMKG",
  source_url: "https://www.bmkg.go.id/berita/contoh",
  observed_at: "2026-09-06T04:00:00+07:00",
  valid_minutes: 180,
  operator: "operator-1",
};

describe("operator status validation", () => {
  it("accepts complete, attributable status input", () => {
    expect(validateOperatorInput(valid).ok).toBe(true);
  });

  it("requires an official HTTPS source URL", () => {
    expect(isOfficialSourceUrl("https://fake-bmkg.go.id/report")).toBe(false);
    const result = validateOperatorInput({
      ...valid,
      source_url: "http://www.bmkg.go.id/report",
    });
    expect(result).toEqual({ ok: false, fields: ["source_url"] });
  });

  it("accepts official Badan Geologi bulletins", () => {
    expect(
      isOfficialSourceUrl("https://geologi.esdm.go.id/sbg/laporan-anak-krakatau"),
    ).toBe(true);
  });

  it("rejects unsafe validity windows", () => {
    const result = validateOperatorInput({ ...valid, valid_minutes: 1440 });
    expect(result).toEqual({ ok: false, fields: ["valid_minutes"] });
  });

  it("deduplicates area codes before insertion", () => {
    const result = validateOperatorInput({
      ...valid,
      areas: ["BTN-SRG-CNK", "BTN-SRG-CNK"],
    });
    expect(result.ok && result.value.areas).toEqual(["BTN-SRG-CNK"]);
  });

  it("records province-wide selection as an explicit assumption", () => {
    const result = validateOperatorInput({
      ...valid,
      scope_basis: "province_mention_assumption",
    });
    expect(result.ok && result.value.scope_basis).toBe("province_mention_assumption");
  });

  it("rejects an unknown scope basis", () => {
    const result = validateOperatorInput({ ...valid, scope_basis: "confirmed_everywhere" });
    expect(result).toEqual({ ok: false, fields: ["scope_basis"] });
  });
});
