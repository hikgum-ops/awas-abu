import { describe, expect, it } from "vitest";
import {
  parseInboundBody,
  parseInboundRequest,
  parseLatLng,
} from "@/lib/awasabu/inbound";

describe("Fonnte payload parsing", () => {
  it("accepts a location-only object with an empty message", () => {
    expect(
      parseInboundBody({
        sender: "628123456789",
        message: "",
        location: { latitude: -6.2833, longitude: 105.8333 },
      }),
    ).toEqual({
      sender: "628123456789",
      text: "",
      coords: { lat: -6.2833, lng: 105.8333 },
    });
  });

  it("accepts nested and stringified location payloads", () => {
    const parsed = parseInboundBody({
      data: {
        from: "+62 812-3456-7890",
        lokasi: '{"lat":-5.75,"lng":105.5833}',
      },
    });
    expect(parsed?.coords).toEqual({ lat: -5.75, lng: 105.5833 });
    expect(parsed?.sender).toBe("6281234567890");
  });

  it("rejects invalid coordinate ranges and short senders", () => {
    expect(parseLatLng("-95,105")).toBeNull();
    expect(parseInboundBody({ sender: "123", message: "Cinangka" })).toBeNull();
  });

  it("parses form-encoded payloads", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        sender: "628123456789",
        message: "Cinangka",
      }),
    });
    expect(await parseInboundRequest(request)).toMatchObject({
      sender: "628123456789",
      text: "Cinangka",
      coords: null,
    });
  });
});
