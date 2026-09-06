import { distanceToVentKm, type Area } from "./areas";
import type { Level, Resolved } from "./status";

const BADGE: Record<Level, string> = {
  AMAN: "🟢 AMAN",
  WASPADA: "🟡 WASPADA",
  AWAS_ABU: "🟠 AWAS ABU",
  BAHAYA: "🔴 BAHAYA",
};

const OFFICIAL =
  "Sumber resmi:\n" +
  "• MAGMA Indonesia — magma.esdm.go.id\n" +
  "• BMKG — bmkg.go.id\n" +
  "• BNPB — bnpb.go.id";

function wib(iso: string): string {
  return (
    new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

function areaLine(area: Area): string {
  const km = Math.round(distanceToVentKm(area));
  return `${area.name}, ${area.regency}\n(±${km} km dari Anak Krakatau)`;
}

export function renderStatus(result: Resolved): string {
  if (result.kind === "no_data") {
    return (
      `❔ BELUM ADA DATA\n${areaLine(result.area)}\n\n` +
      "Kami belum punya informasi abu vulkanik untuk wilayah ini.\n" +
      "Ini BUKAN berarti wilayah Anda aman. Silakan cek langsung:\n\n" +
      OFFICIAL
    );
  }

  const { area, status, ageMin } = result;
  const actions = status.actions.length
    ? `\n${status.actions.map((action) => `• ${action}`).join("\n")}\n`
    : "";
  const header =
    result.kind === "stale"
      ? `⚠️ DATA LAMA (${ageMin} menit lalu)\n\n${BADGE[status.level]}`
      : BADGE[status.level];
  const footer =
    result.kind === "stale"
      ? "\n⚠️ Informasi ini sudah kedaluwarsa dan mungkin tidak lagi akurat.\n" +
        "Jangan jadikan dasar keputusan. Cek langsung:\n\n" +
        OFFICIAL
      : `\nSumber: ${status.source_name}\n${status.source_url}` +
        `\nData per: ${wib(status.observed_at)}`;
  const scopeNote =
    status.scope_basis === "province_mention_assumption"
      ? "\nCATATAN: Wilayah dipilih dari penyebutan provinsi. Ini bukan konfirmasi abu di permukaan pada setiap kecamatan.\n"
      : "";

  return (
    `${header}\n${areaLine(area)}\n\n${status.headline}\n${scopeNote}${actions}` +
    footer +
    "\n\nBalas DAFTAR untuk info wilayah ini."
  );
}

export const HELP =
  "*AWAS ABU* — info abu vulkanik dari sumber resmi\n\n" +
  "Cara pakai:\n" +
  "📍 Kirim *lokasi* Anda (klik 📎 → Lokasi)\n" +
  "✍️ atau ketik nama kecamatan, contoh: *Cinangka*\n\n" +
  "Perintah lain:\n" +
  "• DAFTAR — simpan pilihan wilayah\n" +
  "• STOP — berhenti berlangganan\n\n" +
  "⚠️ Layanan ini hanya *meneruskan* informasi resmi. " +
  "Kami bukan lembaga resmi dan tidak mengeluarkan peringatan sendiri.\n\n" +
  OFFICIAL;

export const UNKNOWN_AREA =
  "Maaf, wilayah itu belum kami kenali.\n\n" +
  "Coba kirim *lokasi* Anda langsung (klik 📎 → Lokasi), " +
  "atau ketik nama kecamatan saja, contoh: *Kalianda*.\n\n" +
  "Ketik BANTUAN untuk panduan.";

export const OUT_OF_RANGE =
  "Lokasi Anda di luar wilayah yang kami pantau saat ini.\n\n" +
  `Untuk informasi gunung api di wilayah lain:\n\n${OFFICIAL}`;

export function subscribed(area: Area): string {
  return (
    `✅ Terdaftar untuk ${area.name}, ${area.regency}.\n\n` +
    "Catatan: saat ini kami *belum* mengirim notifikasi otomatis. " +
    "Kirim lokasi kapan saja untuk cek status terbaru.\n\n" +
    "Balas STOP untuk berhenti."
  );
}

export const UNSUBSCRIBED =
  "Anda telah berhenti berlangganan. Terima kasih.\n\n" +
  "Anda tetap bisa cek status kapan saja dengan mengirim lokasi.";

export const RATE_LIMITED =
  "Terlalu banyak permintaan. Coba lagi beberapa menit lagi.";

export const ERROR =
  `Maaf, sistem sedang bermasalah. Silakan cek langsung:\n\n${OFFICIAL}`;
