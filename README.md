# Awas Abu — Phase 0

A mobile-first website and pull-only WhatsApp bot that relay current
volcanic-ash status from an official bulletin. A user shares a location or
types a kecamatan name and receives the current, stale, or no-data state for
the nearest covered area.

This service does **not** issue warnings, predict ash movement, or broadcast.
Missing data is always reported as `BELUM ADA DATA`, never `AMAN`.

## Included

- Public website with GPS permission, automatic kecamatan prefilling, and
  manual kecamatan search
- Accessible status cards for fresh, stale, and no-data results
- Share-to-WhatsApp link for fresh attributed bulletins only
- Fonnte webhook accepting JSON and form payloads
- Location parsing for common Fonnte payload shapes
- Nearest-area lookup with a hard 25 km refusal threshold
- Exact/unambiguous kecamatan and alias matching
- `BANTUAN`, `DAFTAR`, and `STOP` commands
- Six-request/five-minute rate limit per phone number
- Private `/operator` page plus API fallback for official bulletin entry
- Province-name expansion to all Phase 0 coverage areas, visibly marked as an assumption
- Cloudflare D1 storage for status history, subscriptions, and inbound rate limits
- Bundled Phase 0 area directory with approximate public centroids
- Automatic seven-day inbound-log pruning during webhook activity
- Unit tests for location parsing, area matching, attribution, and stale behavior

`DAFTAR` records explicit interest but Phase 0 never sends proactive messages.
There is deliberately no subscriber fan-out code.

## Website use

Open the homepage and select **Gunakan lokasi saya**. The browser asks for
location permission, submits the coordinates in a private request body, and
prefills the nearest monitored kecamatan. Coordinates are discarded after the
lookup. If location access is unavailable or denied, type a kecamatan instead.

The hosted website uses its Sites-managed D1 binding. Operator access is
restricted with `AWASABU_OPERATOR_USER_IDS` or `AWASABU_OPERATOR_EMAILS`;
`AWASABU_OPERATOR_KEY` remains an optional API fallback. Fonnte settings are
optional unless WhatsApp is enabled.

## 1. Install and verify

Requirements: Node.js 22 or later. The Vinext production builder requires
Node.js 22 or newer even though Next.js itself supports older Node.js releases.

```powershell
npm.cmd install
npm.cmd run check
```

## 2. Database

The Sites deployment owns the Cloudflare D1 database declared as `DB` in
`.openai/hosting.json`. Schema changes live in `db/schema.ts`; generated,
append-only SQL migrations live in `drizzle/` and are applied during publish.
The old `supabase/schema.sql` is retained only as historical Phase 0 reference.

The seeded coordinates are approximate kecamatan centroids. They are suitable
only for a controlled Phase 0 trial. Replace them with verified BPS boundary
data before a public launch.

Current coverage contains 21 Phase 0 area records: 12 in Banten, 8 in Lampung,
and 1 DKI Jakarta aggregate. A province mention expands only to these bundled
records; it does not imply that every administrative kecamatan in the province
is represented.

## 3. Configure server secrets

Copy `.env.example` to `.env.local` and replace every placeholder:

```dotenv
AWASABU_OPERATOR_USER_IDS=replace-with-account-user-id
AWASABU_OPERATOR_EMAILS=operator@example.com
FONNTE_TOKEN=replace-me
AWASABU_WEBHOOK_SECRET=replace-me
AWASABU_OPERATOR_KEY=replace-me
```

None of these values may use a `NEXT_PUBLIC_` prefix. Use a dedicated Fonnte
device and phone number; do not reuse an order-intake number.

## 4. Run locally

```powershell
npm.cmd run dev
```

`GET /api/health` returns `200` only when all required settings are present.
It does not expose the settings.

## 5. Configure Fonnte

Set the dedicated device webhook to:

```text
https://your-domain.example/api/webhooks/fonnte-awasabu?k=YOUR_WEBHOOK_SECRET
```

Enable message and location forwarding. Before any launch, send one real
location message from a test phone and verify that the reply resolves the
expected kecamatan. Fonnte location field names have varied; the parser covers
`location`, `lokasi`, `latitude_longitude`, top-level latitude/longitude,
nested `data`, JSON location strings, and `lat,lng` text, but live payload
acceptance remains a launch gate.

Coordinates are used in memory, converted to an area code, and discarded.
Neither coordinates nor inbound message text are inserted into the database or
written to application logs.

## Operator runbook

During an active event, an authorized user opens `/operator` and relays each
official bulletin. Use the
timestamp printed on the bulletin—not the time of data entry. The endpoint
accepts HTTPS source URLs only from BMKG, MAGMA Indonesia, Badan Geologi, or
BNPB domains.

The operator can paste a source excerpt and apply the province assumption. If
the source explicitly names Banten, Lampung, or DKI Jakarta, the form selects
every Phase 0 area in that province and saves
`scope_basis=province_mention_assumption`. Public website and WhatsApp replies
must show that this is assumed regional coverage, not confirmation of ash at
ground level in every kecamatan.

```powershell
$headers = @{
  "x-operator-key" = $env:AWASABU_OPERATOR_KEY
  "content-type" = "application/json"
}

$body = @{
  areas = @("BTN-SRG-CNK", "BTN-SRG-ANY", "BTN-PDG-CRT", "BTN-PDG-LBN")
  level = "AWAS_ABU"
  headline = "Hujan abu vulkanik sedang berlangsung di wilayah pesisir."
  actions = @(
    "Pakai masker dan kacamata bila keluar rumah"
    "Tutup tandon dan sumber air"
    "Tutup pintu dan jendela"
    "Kurangi aktivitas di luar ruangan"
  )
  source_name = "BMKG"
  source_url = "https://www.bmkg.go.id/berita/contoh-buletin"
  observed_at = "2026-09-06T04:00:00+07:00"
  valid_minutes = 180
  scope_basis = "operator_selected"
  operator = "operator-1"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://your-domain.example/api/awasabu/status" `
  -Headers $headers `
  -Body $body
```

Read back current and stale rows:

```powershell
Invoke-RestMethod `
  -Uri "https://your-domain.example/api/awasabu/status" `
  -Headers @{ "x-operator-key" = $env:AWASABU_OPERATOR_KEY }
```

`valid_minutes` must be between 1 and 360. Once it elapses, replies visibly
switch to `DATA LAMA`, tell the user not to rely on the result, and point to
official channels.

## Levels

| Level | Operator rule |
|---|---|
| `AMAN` | Use only when an official bulletin explicitly puts the area outside the ash path |
| `WASPADA` | Relay an official statement that ash is possible for the area |
| `AWAS_ABU` | Relay an official statement that ashfall is occurring or imminent |
| `BAHAYA` | Relay an actual government evacuation or exclusion instruction verbatim |

Never originate a `BAHAYA` instruction.

## Automation and public development

The repository contains the province-expansion rule and audit field, but no
scheduled scraper or automatic publisher yet. The proposed ingestion boundary,
review gates, and source-handling rules are documented in
[`docs/AUTOMATION.md`](docs/AUTOMATION.md).

Before making the GitHub repository public:

1. Run `npm.cmd run check` and a secret scan.
2. Review the full Git history, not only the current files.
3. Publish the clean `public-release` branch as the public repository's `main`;
   do not publish the private local development history.
4. Keep hosted environment values in Sites or GitHub Secrets, never in commits.
5. Forks must replace the Sites `project_id` with a project they own before
   deploying. The committed ID identifies the current Awas Abu Site but is not
   a deployment credential.

The code is available under the [`MIT License`](LICENSE). See
[`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md), and the
step-by-step [`public release guide`](docs/PUBLIC_RELEASE.md). GitHub pull
requests run the same lint, type, test, and production-build checks as local
development. Publishing the repository does not make the current hosted site
public or grant deployment access to it.

## Launch gates

- D1 migration applied and `/api/health` reports `database: connected`
- Dedicated Fonnte device/number connected
- Real inbound text payload verified
- Real inbound shared-location payload verified against the expected area
- Fresh, stale, and no-data replies manually accepted
- Operator POST/GET exercised with a real official bulletin URL
- Province-assumption result visibly labelled on web and WhatsApp
- Public deployment health check returns `ok`
- PSE and privacy obligations reviewed before public promotion

Phase 0 is complete when those live acceptance checks pass. Repository checks
alone do not prove Fonnte delivery or D1 connectivity.
