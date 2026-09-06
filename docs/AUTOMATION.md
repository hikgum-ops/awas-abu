# Automation boundary

Awas Abu may automate discovery and drafting, but publishing remains a
separate, authenticated decision. The first automation milestone should create
reviewable candidates; it must not publish warnings directly.

## Proposed flow

1. Poll a small allowlist of official index pages at a respectful interval.
2. Detect unseen canonical article URLs and deduplicate them by URL and SHA-256
   content hash.
3. Stream only the text-bearing portion of a new article. Stop after the
   recommendations are found or a strict byte limit is reached; official pages
   can contain very large embedded images.
4. Extract factual fields: source, report number, observed time, activity level,
   recommendation text, named places, and the canonical URL.
5. Store the extraction as an immutable candidate with parser version and
   source hash.
6. Prefill `/operator`. An authorized operator compares the candidate with the
   linked source, chooses the public level, validity, and actions, then publishes.

Suggested future tables are `aa_source_document` and `aa_status_candidate`.
They should be introduced through a new append-only Drizzle migration.

## Province-name rule

`inferProvinceImpactAssumptions()` expands an explicit province-name mention to
every area currently bundled for that province. The result must use
`scope_basis=province_mention_assumption`.

Important boundaries:

- The expansion covers the repository's Phase 0 directory, not every real
  kecamatan in the province.
- `Lampung Selatan` alone is treated as a regency name and does not trigger the
  whole Lampung province.
- A plain Jakarta publication dateline does not trigger DKI Jakarta; the source
  must say `DKI Jakarta`.
- Province expansion is a coverage assumption. It is not evidence of ashfall at
  ground level in every selected area.

## Non-negotiable safety rules

- Never infer surface ashfall solely from a satellite image, aviation polygon,
  SIGMET, VONA, or broad plume description.
- Keep volcanic activity, airborne ash, observed local ashfall, and evacuation
  instructions as distinct concepts.
- Never auto-publish `AMAN` or `BAHAYA`.
- Never convert missing or expired data to `AMAN`.
- Preserve the source URL, observed time, parser version, and scope basis.
- Do not store visitor GPS coordinates, message bodies, private phone numbers,
  session cookies, or downloaded embedded images.
- Rate-limit fetching, identify the service in its User-Agent, honor official
  access policies, and back off on errors.

## Scheduler options

The scheduler is intentionally not selected in Phase 0. A future implementation
can use an independently managed scheduled worker or CI schedule to call a
protected ingestion endpoint. Scheduler credentials belong only in the hosting
provider's secret store. Browser visits must never be the only emergency polling
mechanism.
