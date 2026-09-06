export type Inbound = {
  sender: string;
  text: string;
  coords: { lat: number; lng: number } | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

export function parseLatLng(value: string): { lat: number; lng: number } | null {
  const match = value.match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function coordsFromRecord(record: UnknownRecord): Inbound["coords"] {
  const rawLat = record.latitude ?? record.lat;
  const rawLng = record.longitude ?? record.lng ?? record.lon;
  if (rawLat === "" || rawLng === "" || rawLat == null || rawLng == null) {
    return null;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function coordsFromUnknown(value: unknown): Inbound["coords"] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = asRecord(JSON.parse(trimmed));
        return parsed ? coordsFromRecord(parsed) : null;
      } catch {
        return parseLatLng(trimmed);
      }
    }
    return parseLatLng(trimmed);
  }
  const record = asRecord(value);
  return record ? coordsFromRecord(record) : null;
}

export function parseInboundBody(body: UnknownRecord): Inbound | null {
  const nested = asRecord(body.data);
  const source = nested ? { ...body, ...nested } : body;
  const sender = String(
    source.sender ?? source.pengirim ?? source.from ?? "",
  ).replace(/\D/g, "");
  if (sender.length < 8 || sender.length > 16) return null;

  const text = String(
    source.message ?? source.text ?? source.pesan ?? "",
  ).trim();
  const rawLocation =
    source.location ?? source.lokasi ?? source.latitude_longitude ?? null;

  let coords = coordsFromUnknown(rawLocation);
  if (!coords && source.latitude != null && source.longitude != null) {
    coords = coordsFromRecord(source);
  }
  if (!coords && text) coords = parseLatLng(text);
  return { sender, text, coords };
}

export async function parseInboundRequest(request: Request): Promise<Inbound | null> {
  const contentType = request.headers.get("content-type") ?? "";
  let body: UnknownRecord;

  if (contentType.includes("application/json")) {
    const parsed: unknown = await request.json();
    body = asRecord(parsed) ?? {};
  } else {
    const form = await request.formData();
    body = {};
    form.forEach((value, key) => {
      body[key] = typeof value === "string" ? value : "";
    });
  }
  return parseInboundBody(body);
}
