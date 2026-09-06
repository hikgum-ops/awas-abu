# PRD — "Awas Abu" (working title)
### Public volcanic ash & eruption warning relay for Indonesia

**Version:** 0.1 draft
**Date:** 6 September 2026
**Status:** Concept for review
**Trigger context:** Anak Krakatau continuous eruption since 4 Sept 2026; ash reaching Banten, Lampung, West Java and Jakarta.

---

## 1. Problem statement

Official eruption data in Indonesia is **already good and already public** — PVMBG/MAGMA Indonesia, BMKG, VAAC Darwin, BNPB. The failure is not detection. The failure is the **last mile**:

- Data is published as PDFs, technical bulletins, and social media posts written for scientists and journalists.
- A resident in Cinangka or Kalianda has to piece together: is ash coming to *my* village, and what do I do in the next hour?
- Into that gap flows WhatsApp hoax traffic — especially tsunami rumours, which BNPB has explicitly asked people not to spread.
- People who most need the warning have the weakest devices and the worst connectivity.

**We are not building a warning system. We are building a translation and delivery layer on top of the official one.**

---

## 2. Goals

| # | Goal | Success measure |
|---|---|---|
| G1 | Answer "is ash coming to me?" in under 2 seconds from open | Time-to-answer measured in analytics |
| G2 | Reach people without an app install | ≥50% of active users via WhatsApp/web, not native app |
| G3 | Work on a 2 GB Android on 3G | Lighthouse perf ≥90, first load <200 KB |
| G4 | Never be the source of a rumour | 100% of alerts traceable to a named official bulletin + timestamp |
| G5 | Degrade honestly | Stale data visibly marked, never silently shown as current |

## 3. Non-goals

- **We do not issue warnings.** Only BNPB/PVMBG/BMKG have that authority. We relay, attribute, and timestamp.
- No user-generated alerts, no crowd-sourced eruption reports in v1.
- No tsunami prediction, ever. We relay official tsunami bulletins only.
- Not an aviation product. VAAC data is used for context, not for flight decisions.
- Not a social feed.

---

## 4. Users

**P1 — Coastal resident (Banten / Lampung, primary).**
Low-end Android, prepaid data, often intermittent signal. Wants: am I affected, what do I do, where do I go. May not read technical Indonesian comfortably.

**P2 — Urban resident in the ash path (Jakarta, Bandung, Bandar Lampung).**
Good device and connection. Wants: is it safe to go outside, is my flight cancelled, should my kids go to school.

**P3 — Local official / school principal / RT-RW head.**
Needs something authoritative to forward to a group. Wants a shareable card with a visible official source.

**P4 — Diaspora / family member abroad.**
Wants to check on a specific kecamatan remotely.

---

## 5. Core experience

### 5.1 The one screen

Open → geolocation (or saved kecamatan) → a single full-width status block:

```
┌─────────────────────────────┐
│      ⚠  AWAS ABU            │  ← colour = severity
│   Kec. Cinangka, Serang     │
│                             │
│   Abu vulkanik diperkirakan │
│   melintas 2–6 jam ke depan │
│                             │
│   • Pakai masker di luar    │
│   • Tutup tandon air        │
│   • Tutup jendela           │
│                             │
│   Sumber: PVMBG + BMKG      │
│   Diperbarui 07:10 WIB      │
└─────────────────────────────┘
```

Four states: **AMAN** (green) / **WASPADA** (yellow) / **AWAS ABU** (orange) / **BAHAYA** (red, official evacuation order relayed).

Everything else lives below the fold or behind one tap.

### 5.2 Map (v1)

Deliberately dumb. No layer menu.
- Ash dispersion polygon (from BMKG / VAAC advisory)
- Wind direction arrow
- 3 km exclusion radius around the vent (or whatever PVMBG currently sets)
- User's location dot
- Nearest official evacuation point (InaRISK)

### 5.3 Bulletin feed

Reverse-chronological, plain language. Each card: what happened, what it means for you, source badge, timestamp, "share to WhatsApp" button that includes the source attribution in the shared text.

### 5.4 WhatsApp bot (the real product)

More Indonesians will use this than will ever install anything.

- Send `LOKASI` + share location → status reply
- Send a kecamatan name → status reply
- Opt in with `DAFTAR` → push alerts for that kecamatan
- `STOP` → unsubscribe
- Inbound is free (service window); only outbound broadcasts cost money.

### 5.5 Accessibility requirements

- PWA, installable but fully functional without install
- Service worker caches last bulletin; offline shows last known state with an explicit "data lama" banner
- Bahasa Indonesia default; Sundanese and Lampungese phrasing for action instructions
- Text scales to 200% without breaking
- Colour never the only signal (icon + text label always present)
- Total first load budget: 200 KB

---

## 6. Data sources

| Source | What we take | Method | Cadence |
|---|---|---|---|
| MAGMA Indonesia (PVMBG) | Eruption reports, alert level, exclusion radius | Public API / scrape | 5 min |
| BMKG | Ash dispersion clusters, height, direction | Web/API | 15 min |
| VAAC Darwin | Ash advisory polygons, flight levels | Text advisory parse | On publication |
| BNPB / InaRISK | Evacuation points, official statements | API | Daily + on event |
| Himawari-9 RGB | Visual confirmation image | Image fetch | Hourly |

**Ingestion rule:** every record stored with source name, source URL, publication timestamp, and fetch timestamp. Nothing is displayed without all four.

---

## 7. Architecture

```
Official sources ──> Poller (cron, 5 min)
                          │
                          ▼
                  Normaliser + severity mapper
                          │
                          ▼
              Postgres + PostGIS (Supabase)
                 ash polygons, kecamatan
                 boundaries, subscriptions
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   PWA (Next.js)     FCM push topics    WhatsApp gateway
   + service worker  per kecamatan      (Fonnte → later WABA)
```

**Severity assignment** is a point-in-polygon query: user's kecamatan centroid against the current ash polygon, joined with PVMBG alert level. No ML, no prediction — the polygon comes from BMKG.

**Fan-out:** FCM topics keyed by kecamatan code. One publish reaches every subscriber in that kecamatan at zero marginal cost. This is the single most important cost decision in the whole design (see §10).

**Stack:** Next.js PWA on Vercel · Supabase (Postgres + PostGIS + Edge Functions + Realtime) · Firebase Cloud Messaging · Fonnte or Meta WABA for WhatsApp.

---

## 8. Phases

### Phase 0 — MVP (1–2 weeks)
WhatsApp bot only. Send location → get ash status for your kecamatan. Manual polygon entry if BMKG parsing is not ready. No app, no map.
*Ships something useful during the current eruption.*

### Phase 1 — PWA (4–6 weeks)
Status screen, bulletin feed, FCM push subscription, offline cache, share card. Automated ingestion from MAGMA + BMKG.

### Phase 2 — Map & multi-volcano (6–8 weeks)
PostGIS polygons, map view, evacuation points, generalise beyond Krakatau to all Indonesian volcanoes on alert.

### Phase 3 — Institutional (open-ended)
Formal data-sharing MoU with BNPB/BMKG. Cell Broadcast integration via Kominfo (reaches every handset in a cell tower area, free to recipients, no install, no subscription). SMS fallback for opt-in coastal zones. This phase is a partnership problem, not an engineering one.

---

## 9. Success metrics

- Median time-to-answer on open: **<2s**
- WhatsApp bot: **>60%** of queries answered without a follow-up message
- Alert delivery latency from official publication: **<10 min**
- Stale-data incidents (current-looking data older than 60 min): **0**
- Correction/retraction count: **0** (a single false alarm destroys the product)

---

## 10. Cost estimate

> All figures September 2026, IDR at ~Rp 16,400/USD. Vendor pricing changes; verify before committing.

### 10.1 Build cost

| Scenario | Scope | Team | Duration | Cost |
|---|---|---|---|---|
| **A — Self-build** | Phase 0 + 1 | You | 120–160 hrs | **Rp 0 cash** (opportunity cost only) |
| **B — Lean hired** | Phase 0 + 1 | 1 fullstack (Rp 15–20 jt/mo) + freelance designer | 8 weeks | **Rp 35–55 jt** |
| **C — Standard** | Phase 0–2 | 2 devs + designer + PM (part-time) | 16 weeks | **Rp 90–160 jt** |
| **D — Agency** | Phase 0–2, SLA, handover | Jakarta agency | 4–5 months | **Rp 180–350 jt** |

One-off items (all scenarios):
- UI/UX design + icon set: Rp 8–15 jt (Rp 0 if self-designed)
- Domain `.id`: Rp 250 rb/yr
- Play Store account (if TWA-wrapped): $25 one-off
- Legal review (UU PDP compliance, disclaimer wording): Rp 5–15 jt
- PSE Kominfo registration: free, ~2–4 weeks admin
- Meta WABA business verification: free, requires NIB

### 10.2 Running cost — by scale

**Tier 1: MVP, <10,000 users**

| Item | Monthly |
|---|---|
| Supabase Pro | $25 (~Rp 410 rb) |
| Vercel Pro | $20 (~Rp 330 rb) |
| FCM push | Rp 0 |
| Fonnte WA gateway (unofficial) | Rp 200–500 rb |
| Monitoring (Sentry free tier) | Rp 0 |
| **Total** | **≈ Rp 1–1.3 jt/month** |

**Tier 2: 100,000 users, PWA + push only**

| Item | Monthly |
|---|---|
| Supabase (Pro + compute/egress) | $100–200 (~Rp 1.6–3.3 jt) |
| Vercel (bandwidth on event spikes) | $50–150 (~Rp 0.8–2.5 jt) |
| FCM push — **unlimited, free** | Rp 0 |
| CDN / image hosting | Rp 300–800 rb |
| **Total** | **≈ Rp 3–7 jt/month** |

**Tier 3: 1,000,000 users, PWA + push only**

| Item | Monthly |
|---|---|
| Supabase / managed Postgres, read replicas | $400–900 (~Rp 6.5–15 jt) |
| CDN + hosting (event-driven spikes) | $300–800 (~Rp 5–13 jt) |
| FCM push | Rp 0 |
| On-call / ops | Rp 10–25 jt (or in-kind) |
| **Total** | **≈ Rp 20–55 jt/month** |

### 10.3 The messaging cost cliff — read this before anything else

Push notification is free at any scale. **Outbound WhatsApp and SMS are not**, and they scale linearly with users. This is where a well-meaning disaster app goes bankrupt in its first real emergency.

Indonesia utility-template rates in 2026 sit roughly at **$0.007–$0.025 per delivered message** (~Rp 115–410), plus BSP markup. Sources disagree on the exact figure; budget the high end.

Cost of **one** broadcast:

| Recipients | WhatsApp (@ Rp 250 avg) | SMS (@ Rp 400 avg) |
|---|---|---|
| 10,000 | Rp 2.5 jt | Rp 4 jt |
| 100,000 | Rp 25 jt | Rp 40 jt |
| 1,000,000 | Rp 250 jt | Rp 400 jt |

During the current Krakatau event you would plausibly send **3–6 broadcasts per day for a week**. At 100k WhatsApp subscribers that is **Rp 500 jt–1 miliar in a single week.**

**Design rules that follow directly from this:**

1. **FCM push is the default channel.** Free, unlimited, works on any Android.
2. **WhatsApp outbound is reserved** for red-level alerts to opt-in subscribers in directly affected kecamatan only — realistically 5,000–20,000 people, not everyone.
3. **Inbound WhatsApp is free** (24-hour service window). Encourage pull, not push: "kirim lokasi kamu" costs nothing.
4. **SMS is Phase 3 and grant-funded only**, or replaced entirely by **Cell Broadcast** — which is free to recipients, needs no subscription, and reaches every handset in a tower's range. That requires Kominfo/BNPB partnership, which is the real unlock.

### 10.4 Realistic first-year budget

| Path | Year 1 total |
|---|---|
| Self-built, push-only, 50k users | **Rp 15–25 jt** |
| Hired lean, push-only + limited WA, 100k users | **Rp 90–150 jt** |
| Standard build, institutional partnership, 500k users | **Rp 250–450 jt** |

---

## 11. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| False alarm or stale data shown as current | **Critical** | Hard staleness threshold; UI degrades to grey "data lama" after 60 min; no interpolation, no guessing |
| Source API changes or goes down mid-eruption | High | Multiple sources, alert on ingestion failure, manual override console for a human operator |
| Users treat us as authoritative and ignore official channels | High | Every screen carries source attribution + link to the official bulletin; never paraphrase in a way that changes meaning |
| Messaging cost blowout during a real event | High | Hard monthly spend cap; push-first architecture; WhatsApp gated to red alerts only |
| Traffic spike at the moment of the eruption | High | Static-first rendering, CDN cache, no auth required to read status |
| Perceived as competing with government | Medium | Position explicitly as a relay; seek BNPB endorsement early |
| UU PDP / location data handling | Medium | Store kecamatan code, never raw coordinates; no account required; PSE registration |

---

## 12. Open questions

1. Does MAGMA Indonesia expose a stable public JSON API, or is scraping required? (Determines Phase 0 timeline.)
2. Is BMKG's ash dispersion published as machine-readable geometry, or only as images? If images only, Phase 2 map needs manual polygon digitisation or a partnership.
3. Who owns this — a foundation, a company, or a volunteer project? Determines funding path and whether WhatsApp costs are survivable.
4. Is there appetite at BNPB for a data-sharing MoU? Without it this stays a hobby project; with it, Cell Broadcast becomes possible and the cost model changes entirely.
5. Kecamatan boundary data — BPS shapefiles, licensing?

---

## 13. Recommendation

Build **Phase 0 this week**: a WhatsApp bot that answers "is ash coming to my kecamatan" from manually-curated BMKG data. Cost: a weekend and under Rp 1 juta. It will be useful *during* the current eruption, which is the only real test of whether anyone wants this.

Everything above Phase 1 depends on institutional partnership, not on engineering. Do not spend money on the map until the bot has users.
