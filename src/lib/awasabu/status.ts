import { getD1 } from "../../../db";
import type { Area } from "./areas";
import type { ScopeBasis } from "./impact-scope";

export type Level = "AMAN" | "WASPADA" | "AWAS_ABU" | "BAHAYA";

export type StatusRow = {
  area_code: string;
  level: Level;
  headline: string;
  actions: string[];
  source_name: string;
  source_url: string;
  observed_at: string;
  expires_at: string;
  scope_basis: ScopeBasis;
};

export type Resolved =
  | { kind: "fresh"; area: Area; status: StatusRow; ageMin: number }
  | { kind: "stale"; area: Area; status: StatusRow; ageMin: number }
  | { kind: "no_data"; area: Area };

export function classifyStatus(
  area: Area,
  status: StatusRow | null,
  nowMs = Date.now(),
): Resolved {
  if (!status) return { kind: "no_data", area };

  const ageMin = Math.max(
    0,
    Math.round((nowMs - new Date(status.observed_at).getTime()) / 60_000),
  );
  return nowMs >= new Date(status.expires_at).getTime()
    ? { kind: "stale", area, status, ageMin }
    : { kind: "fresh", area, status, ageMin };
}

export async function resolveStatus(area: Area): Promise<Resolved> {
  const row = await getD1()
    .prepare(
      `SELECT area_code, level, headline, actions, source_name, source_url,
              observed_at, expires_at, scope_basis
       FROM aa_status
       WHERE area_code = ?
       ORDER BY observed_at DESC, id DESC
       LIMIT 1`,
    )
    .bind(area.code)
    .first<Omit<StatusRow, "actions"> & { actions: string }>();

  if (!row) return classifyStatus(area, null);
  let actions: string[] = [];
  try {
    const parsed = JSON.parse(row.actions);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      actions = parsed;
    }
  } catch {
    // A malformed stored action list must not break the public safety result.
  }
  return classifyStatus(area, { ...row, actions } as StatusRow);
}
