import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/awasabu/check/route";

describe("public website lookup endpoint", () => {
  it("rejects a missing kecamatan before accessing the database", async () => {
    const response = await GET(
      new NextRequest("https://example.test/api/awasabu/check?area=a"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_area" });
  });

  it("rejects incomplete or out-of-range GPS coordinates", async () => {
    const incomplete = await POST(
      new NextRequest("https://example.test/api/awasabu/check", {
        method: "POST",
        body: JSON.stringify({ lat: -6.2 }),
      }),
    );
    expect(incomplete.status).toBe(400);

    const invalid = await POST(
      new NextRequest("https://example.test/api/awasabu/check", {
        method: "POST",
        body: JSON.stringify({ lat: -96, lng: 105.8 }),
      }),
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "invalid_location" });
  });

  it("prevents lookup responses from being cached", async () => {
    const response = await GET(
      new NextRequest("https://example.test/api/awasabu/check"),
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("still returns a matched kecamatan when the status feed is unavailable", async () => {
    const response = await GET(
      new NextRequest("https://example.test/api/awasabu/check?area=Cinangka"),
    );
    expect(response.status).toBe(503);
    const body = await response.json() as {
      kind: string;
      area: { name: string; map_center: { lat: number; lng: number } };
    };
    expect(body.kind).toBe("service_unavailable");
    expect(body.area.name).toBe("Cinangka");
    expect(body.area.map_center).toEqual({ lat: -6.2833, lng: 105.8333 });
  });

  it("prefills a kecamatan from GPS coordinates without a live status feed", async () => {
    const response = await POST(
      new NextRequest("https://example.test/api/awasabu/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: -6.2833, lng: 105.8333 }),
      }),
    );
    expect(response.status).toBe(503);
    const body = await response.json() as {
      kind: string;
      area: { name: string };
    };
    expect(body.kind).toBe("service_unavailable");
    expect(body.area.name).toBe("Cinangka");
  });
});
