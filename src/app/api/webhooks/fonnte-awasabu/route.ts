import { NextRequest, NextResponse } from "next/server";
import { areaByCode, areaByCoords, areaByName, type Area } from "@/lib/awasabu/areas";
import { secretsMatch } from "@/lib/awasabu/auth";
import { getD1 } from "../../../../../db";
import { sendReply } from "@/lib/awasabu/fonnte";
import { parseInboundRequest } from "@/lib/awasabu/inbound";
import * as Reply from "@/lib/awasabu/reply";
import { resolveStatus } from "@/lib/awasabu/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AWASABU_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[awasabu] AWASABU_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const providedSecret =
    request.headers.get("x-webhook-secret") ?? request.nextUrl.searchParams.get("k");
  if (!secretsMatch(providedSecret, expectedSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let inbound;
  try {
    inbound = await parseInboundRequest(request);
  } catch {
    // Acknowledge malformed provider payloads so Fonnte does not retry-storm.
    return NextResponse.json({ ok: true });
  }
  if (!inbound) return NextResponse.json({ ok: true });

  const { sender, text, coords } = inbound;

  try {
    const db = getD1();
    const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
    const recent = await db
      .prepare("SELECT COUNT(*) AS count FROM aa_inbound WHERE phone = ? AND created_at > ?")
      .bind(sender, cutoff)
      .first<{ count: number }>();
    if ((recent?.count ?? 0) >= 6) {
      await sendReply(sender, Reply.RATE_LIMITED);
      return NextResponse.json({ ok: true });
    }

    const command = text.toUpperCase().trim();
    let intent = "unknown";
    let area: Area | null = null;
    let message: string;

    if (command === "STOP" || command === "BERHENTI") {
      intent = "stop";
      await db
        .prepare("UPDATE aa_subscriber SET active = 0, updated_at = ? WHERE phone = ?")
        .bind(new Date().toISOString(), sender)
        .run();
      message = Reply.UNSUBSCRIBED;
    } else if (command === "DAFTAR" || command === "SUBSCRIBE") {
      intent = "daftar";
      const subscription = await db
        .prepare("SELECT area_code FROM aa_subscriber WHERE phone = ?")
        .bind(sender)
        .first<{ area_code: string | null }>();

      area = subscription?.area_code
        ? await areaByCode(subscription.area_code)
        : null;
      if (area) {
        await db
          .prepare("UPDATE aa_subscriber SET active = 1, updated_at = ? WHERE phone = ?")
          .bind(new Date().toISOString(), sender)
          .run();
        message = Reply.subscribed(area);
      } else {
        message =
          "Kirim *lokasi* Anda dulu (klik 📎 → Lokasi), " +
          "lalu balas DAFTAR untuk menyimpan wilayah tersebut.";
      }
    } else if (coords) {
      // Location-only Fonnte payloads often have an empty message body.
      intent = "location";
      const match = await areaByCoords(coords.lat, coords.lng);
      if (!match) {
        message = Reply.OUT_OF_RANGE;
      } else {
        area = match.area;
        message = Reply.renderStatus(await resolveStatus(area));
        await rememberArea(sender, area.code);
      }
    } else if (
      command === "BANTUAN" ||
      command === "HELP" ||
      command === "MENU" ||
      !text
    ) {
      intent = "help";
      message = Reply.HELP;
    } else {
      area = await areaByName(text);
      if (!area) {
        intent = "unknown";
        message = Reply.UNKNOWN_AREA;
      } else {
        intent = "area";
        message = Reply.renderStatus(await resolveStatus(area));
        await rememberArea(sender, area.code);
      }
    }

    const now = new Date().toISOString();
    const pruneBefore = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
    await db.batch([
      db.prepare(
        "INSERT INTO aa_inbound (phone, intent, area_code, created_at) VALUES (?, ?, ?, ?)",
      ).bind(sender, intent, area?.code ?? null, now),
      db.prepare("DELETE FROM aa_inbound WHERE created_at < ?").bind(pruneBefore),
    ]);

    await sendReply(sender, message);
    return NextResponse.json({ ok: true });
  } catch {
    // Never include inbound body, coordinates, phone number, or message text in logs.
    console.error("[awasabu] webhook processing failed");
    try {
      await sendReply(sender, Reply.ERROR);
    } catch {
      // The provider may be unavailable; still acknowledge the webhook.
    }
    return NextResponse.json({ ok: true });
  }
}

/** Remember an area without opting the user into future outbound messages. */
async function rememberArea(phone: string, areaCode: string): Promise<void> {
  const now = new Date().toISOString();
  await getD1()
    .prepare(
      `INSERT INTO aa_subscriber
       (phone, area_code, active, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET
         area_code = excluded.area_code,
         updated_at = excluded.updated_at`,
    )
    .bind(phone, areaCode, now, now)
    .run();
}
