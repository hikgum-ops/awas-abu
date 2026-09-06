import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "../../../../../db";
import { BUILT_IN_AREAS } from "@/lib/awasabu/areas";
import { authenticateOperator } from "@/lib/awasabu/operator-auth";
import { validateOperatorInput } from "@/lib/awasabu/operator-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rejectAuth(reason: "missing_configuration" | "unauthorized") {
  if (reason === "missing_configuration") {
    console.error("[awasabu] operator access is not configured");
    return NextResponse.json({ error: "service unavailable" }, { status: 503 });
  }
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const auth = authenticateOperator(request.headers);
  if (!auth.ok) return rejectAuth(auth.reason);

  const validation = validateOperatorInput(await request.json().catch(() => null));
  if (!validation.ok) {
    return NextResponse.json(
      { error: "invalid", fields: validation.fields },
      { status: 400 },
    );
  }

  const input = validation.value;
  const knownAreaCodes = new Set(BUILT_IN_AREAS.map((area) => area.code));
  if (input.areas.some((areaCode) => !knownAreaCodes.has(areaCode))) {
    return NextResponse.json(
      { error: "invalid", fields: ["areas"] },
      { status: 400 },
    );
  }
  const observedAt = new Date(input.observed_at);
  if (observedAt.getTime() > Date.now() + 60_000) {
    return NextResponse.json(
      { error: "observed_at is in the future" },
      { status: 400 },
    );
  }

  const expiresAt = new Date(
    observedAt.getTime() + input.valid_minutes * 60_000,
  ).toISOString();
  const createdAt = new Date().toISOString();
  const rows = input.areas.map((areaCode) => ({
    area_code: areaCode,
    level: input.level,
    headline: input.headline,
    actions: input.actions,
    source_name: input.source_name,
    source_url: input.source_url,
    observed_at: observedAt.toISOString(),
    expires_at: expiresAt,
    scope_basis: input.scope_basis,
    operator: auth.operator,
    created_at: createdAt,
  }));

  try {
    const db = getD1();
    await db.batch(
      rows.map((row) =>
        db.prepare(
          `INSERT INTO aa_status
           (area_code, level, headline, actions, source_name, source_url,
            observed_at, expires_at, scope_basis, operator, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          row.area_code,
          row.level,
          row.headline,
          JSON.stringify(row.actions),
          row.source_name,
          row.source_url,
          row.observed_at,
          row.expires_at,
          row.scope_basis,
          row.operator,
          row.created_at,
        ),
      ),
    );
  } catch {
    console.error("[awasabu] D1 status write failed");
    return NextResponse.json({ error: "database write failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inserted: rows.length, expires_at: expiresAt });
}

export async function GET(request: NextRequest) {
  const auth = authenticateOperator(request.headers);
  if (!auth.ok) return rejectAuth(auth.reason);

  let data: Array<{
    area_code: string;
    level: string;
    headline: string;
    source_name: string;
    source_url: string;
    observed_at: string;
    expires_at: string;
    scope_basis: string;
  }>;
  try {
    const result = await getD1().prepare(
      `SELECT area_code, level, headline, source_name, source_url,
              observed_at, expires_at, scope_basis
       FROM aa_status
       ORDER BY area_code, observed_at DESC, id DESC`,
    ).all<typeof data[number]>();
    const seen = new Set<string>();
    data = result.results.filter((row) => {
      if (seen.has(row.area_code)) return false;
      seen.add(row.area_code);
      return true;
    });
  } catch {
    console.error("[awasabu] D1 status read failed");
    return NextResponse.json({ error: "database read failed" }, { status: 500 });
  }

  const now = Date.now();
  return NextResponse.json({
    live: data.filter((row) => new Date(row.expires_at).getTime() > now),
    stale: data.filter((row) => new Date(row.expires_at).getTime() <= now),
  });
}
