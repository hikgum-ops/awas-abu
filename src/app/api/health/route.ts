import { NextResponse } from "next/server";
import { getD1 } from "../../../../db";

export async function GET() {
  let databaseAvailable = false;
  try {
    await getD1().prepare("SELECT 1 AS ok").first();
    databaseAvailable = true;
  } catch {
    // Health responses remain public and never expose binding details.
  }
  const operatorConfigured = Boolean(
    process.env.AWASABU_OPERATOR_USER_IDS || process.env.AWASABU_OPERATOR_KEY,
  );
  const websiteConfigured = databaseAvailable && operatorConfigured;
  return NextResponse.json(
    {
      status: websiteConfigured ? "ok" : "configuration_required",
      database: databaseAvailable ? "connected" : "unavailable",
    },
    { status: websiteConfigured ? 200 : 503 },
  );
}
