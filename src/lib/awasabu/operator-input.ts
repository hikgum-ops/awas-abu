import type { Level } from "./status";
import { SCOPE_BASES, type ScopeBasis } from "./impact-scope";

const LEVELS: Level[] = ["AMAN", "WASPADA", "AWAS_ABU", "BAHAYA"];
const OFFICIAL_HOSTS = [
  "bmkg.go.id",
  "magma.esdm.go.id",
  "geologi.esdm.go.id",
  "bnpb.go.id",
];
const AREA_CODE = /^[A-Z0-9]{2,5}(?:-[A-Z0-9]{2,5}){2,4}$/;

export type OperatorStatusInput = {
  areas: string[];
  level: Level;
  headline: string;
  actions: string[];
  source_name: string;
  source_url: string;
  observed_at: string;
  valid_minutes: number;
  scope_basis: ScopeBasis;
  operator: string;
};

type ValidationResult =
  | { ok: true; value: OperatorStatusInput }
  | { ok: false; fields: string[] };

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= max ? cleaned : null;
}

export function isOfficialSourceUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      OFFICIAL_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}

export function validateOperatorInput(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, fields: ["body"] };
  }
  const body = raw as Record<string, unknown>;
  const fields: string[] = [];

  const rawAreas = body.areas;
  const areas = Array.isArray(rawAreas)
    ? [...new Set(rawAreas.filter((v): v is string => typeof v === "string"))]
    : [];
  if (
    !Array.isArray(rawAreas) ||
    rawAreas.some((area) => typeof area !== "string") ||
    areas.length === 0 ||
    areas.length > 50 ||
    areas.some((area) => !AREA_CODE.test(area))
  ) {
    fields.push("areas");
  }

  const level = body.level as Level;
  if (!LEVELS.includes(level)) fields.push("level");
  const headline = cleanText(body.headline, 500);
  if (!headline) fields.push("headline");

  const rawActions = body.actions ?? [];
  const actions = Array.isArray(rawActions)
    ? rawActions.map((action) => cleanText(action, 240))
    : null;
  if (!actions || actions.length > 8 || actions.some((action) => !action)) {
    fields.push("actions");
  }

  const sourceName = cleanText(body.source_name, 100);
  if (!sourceName) fields.push("source_name");
  const sourceUrl = cleanText(body.source_url, 2048);
  if (!sourceUrl || !isOfficialSourceUrl(sourceUrl)) fields.push("source_url");

  const observedAt =
    typeof body.observed_at === "string" &&
    Number.isFinite(Date.parse(body.observed_at))
      ? body.observed_at
      : null;
  if (!observedAt) fields.push("observed_at");

  const validMinutes = Number(body.valid_minutes ?? 180);
  if (!Number.isInteger(validMinutes) || validMinutes < 1 || validMinutes > 360) {
    fields.push("valid_minutes");
  }

  const scopeBasis = body.scope_basis ?? "operator_selected";
  if (
    typeof scopeBasis !== "string" ||
    !SCOPE_BASES.includes(scopeBasis as ScopeBasis)
  ) {
    fields.push("scope_basis");
  }

  const operator = cleanText(body.operator, 100);
  if (!operator) fields.push("operator");
  if (fields.length) return { ok: false, fields };

  return {
    ok: true,
    value: {
      areas,
      level,
      headline: headline!,
      actions: actions as string[],
      source_name: sourceName!,
      source_url: sourceUrl!,
      observed_at: observedAt!,
      valid_minutes: validMinutes,
      scope_basis: scopeBasis as ScopeBasis,
      operator: operator!,
    },
  };
}
