# Contributing to Awas Abu

Thank you for helping improve this public-safety relay. Changes should make the
source, uncertainty, and user action clearer without presenting Awas Abu as an
official warning authority.

## Development

Requirements: Node.js 22 or later.

```powershell
npm.cmd install
npm.cmd run check
```

Open a focused pull request and explain the user-facing behavior, data source,
failure mode, and tests. Include a new test for every parser, area-mapping, or
status-classification rule.

## Safety invariants

- Accept only HTTPS URLs from the explicit official-source allowlist.
- Keep `BELUM ADA DATA`, `DATA LAMA`, and `AMAN` distinct.
- Treat province-wide expansion as `province_mention_assumption` and display the
  assumption to the public.
- Do not interpret satellite imagery as confirmed ground-level ashfall.
- Do not add automatic subscriber broadcasts or an automatic `BAHAYA` path.
- Do not store precise GPS coordinates, inbound message text, credentials, or
  unnecessary personal data.
- Keep applied Drizzle migrations and their metadata immutable. Add a new
  migration for every later schema change.

## Source additions

A new source needs evidence that it is an official government or authorized
hazard-information channel. Add its exact hostname to the allowlist, document
what the source can and cannot establish, and test lookalike-domain rejection.

## Data directory changes

Area coordinates are approximate public centroids. Large coverage changes should
use a cited administrative dataset and document its date, license, and update
process. Do not claim complete provincial coverage while the directory contains
only a subset.
