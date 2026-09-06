import { describe, expect, it } from "vitest";
import type { Area } from "@/lib/awasabu/areas";
import { renderStatus } from "@/lib/awasabu/reply";
import { classifyStatus, type StatusRow } from "@/lib/awasabu/status";
import { getSafetyGuidance } from "@/lib/awasabu/safety-guidance";

const area: Area = {
  code: "BTN-SRG-CNK",
  name: "Cinangka",
  regency: "Kab. Serang",
  province: "Banten",
  lat: -6.2833,
  lng: 105.8333,
  aliases: [],
};

const status: StatusRow = {
  area_code: area.code,
  level: "AWAS_ABU",
  headline: "Hujan abu sedang berlangsung.",
  actions: ["Pakai masker"],
  source_name: "BMKG",
  source_url: "https://www.bmkg.go.id/",
  observed_at: "2026-09-06T00:00:00.000Z",
  expires_at: "2026-09-06T03:00:00.000Z",
  scope_basis: "operator_selected",
};

describe("status safety states", () => {
  it("never converts missing status into AMAN", () => {
    const result = classifyStatus(area, null);
    expect(result.kind).toBe("no_data");
    expect(renderStatus(result).startsWith("❔ BELUM ADA DATA")).toBe(true);
  });

  it("marks data stale exactly when its validity expires", () => {
    const now = new Date(status.expires_at).getTime();
    const result = classifyStatus(area, status, now);
    expect(result.kind).toBe("stale");
    expect(renderStatus(result)).toContain("DATA LAMA");
    expect(renderStatus(result)).toContain("Jangan jadikan dasar keputusan");
  });

  it("includes official attribution for fresh data", () => {
    const result = classifyStatus(
      area,
      status,
      new Date("2026-09-06T01:00:00.000Z").getTime(),
    );
    const reply = renderStatus(result);
    expect(result.kind).toBe("fresh");
    expect(reply).toContain("Sumber: BMKG");
    expect(reply).toContain(status.source_url);
  });

  it("provides immediate readable actions when ash is detected", () => {
    const guidance = getSafetyGuidance("AWAS_ABU");
    expect(guidance?.title).toContain("Abu terdeteksi");
    expect(guidance?.steps.map((step) => step.title)).toEqual([
      "Masuk ke dalam ruangan",
      "Tutup jalan masuk abu",
      "Lindungi napas dan mata",
      "Hindari berkendara",
    ]);
    expect(guidance?.medical).toContain("sesak napas");
  });

  it("labels province-wide expansion as an assumption", () => {
    const result = classifyStatus(
      area,
      { ...status, scope_basis: "province_mention_assumption" },
      new Date("2026-09-06T01:00:00.000Z").getTime(),
    );
    expect(renderStatus(result)).toContain("Wilayah dipilih dari penyebutan provinsi");
    expect(renderStatus(result)).toContain("bukan konfirmasi abu di permukaan");
  });

  it("does not show an urgent ash checklist for AMAN", () => {
    expect(getSafetyGuidance("AMAN")).toBeNull();
  });
});
