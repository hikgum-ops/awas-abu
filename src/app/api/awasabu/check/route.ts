import { NextRequest, NextResponse } from "next/server";
import {
  areaByCoords,
  areaByName,
  distanceToVentKm,
  type Area,
} from "@/lib/awasabu/areas";
import { resolveStatus } from "@/lib/awasabu/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function statusForArea(area: Area) {
  const publicArea = {
    code: area.code,
    name: area.name,
    regency: area.regency,
    province: area.province,
    distance_km: Math.round(distanceToVentKm(area)),
    map_center: { lat: area.lat, lng: area.lng },
  };

  let result;
  try {
    result = await resolveStatus(area);
  } catch {
    console.error("[awasabu] status feed unavailable for matched area");
    return json({ kind: "service_unavailable", area: publicArea, status: null }, 503);
  }

  if (result.kind === "no_data") {
    return json({ kind: "no_data", area: publicArea, status: null });
  }

  return json({
    kind: result.kind,
    area: publicArea,
    status: {
      level: result.status.level,
      headline: result.status.headline,
      actions: result.status.actions,
      source_name: result.status.source_name,
      source_url: result.status.source_url,
      observed_at: result.status.observed_at,
      expires_at: result.status.expires_at,
      scope_basis: result.status.scope_basis,
      age_minutes: result.ageMin,
    },
  });
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("area")?.trim() ?? "";
  if (query.length < 3 || query.length > 100) {
    return json({ error: "invalid_area" }, 400);
  }

  try {
    const area = await areaByName(query);
    return area
      ? statusForArea(area)
      : json({ error: "area_not_found" }, 404);
  } catch {
    console.error("[awasabu] public area check failed");
    return json({ error: "configuration_or_service_unavailable" }, 503);
  }
}

/**
 * Location lookup uses a request body so precise coordinates do not appear in
 * browser history, CDN URLs, or ordinary HTTP access logs.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { lat?: unknown; lng?: unknown }
    | null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (
    body?.lat == null ||
    body?.lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return json({ error: "invalid_location" }, 400);
  }

  try {
    const area = (await areaByCoords(lat, lng))?.area ?? null;
    return area
      ? statusForArea(area)
      : json({ error: "outside_coverage" }, 404);
  } catch {
    console.error("[awasabu] public location check failed");
    return json({ error: "configuration_or_service_unavailable" }, 503);
  }
}
