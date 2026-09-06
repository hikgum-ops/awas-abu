"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSafetyGuidance } from "@/lib/awasabu/safety-guidance";
import type { ScopeBasis } from "@/lib/awasabu/impact-scope";

type PublicArea = {
  code: string;
  name: string;
  regency: string;
  province: string;
  distance_km: number;
  map_center: { lat: number; lng: number };
};

type PublicStatus = {
  level: "AMAN" | "WASPADA" | "AWAS_ABU" | "BAHAYA";
  headline: string;
  actions: string[];
  source_name: string;
  source_url: string;
  observed_at: string;
  expires_at: string;
  scope_basis: ScopeBasis;
  age_minutes: number;
};

type LookupResult =
  | { kind: "no_data"; area: PublicArea; status: null }
  | { kind: "service_unavailable"; area: PublicArea; status: null }
  | { kind: "fresh" | "stale"; area: PublicArea; status: PublicStatus };

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
}

const LEVEL_LABEL = {
  AMAN: "AMAN",
  WASPADA: "WASPADA",
  AWAS_ABU: "AWAS ABU",
  BAHAYA: "BAHAYA",
};

const LEVEL_ICON = {
  AMAN: "✓",
  WASPADA: "!",
  AWAS_ABU: "!",
  BAHAYA: "!!",
};

function formatWib(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)) + " WIB";
}

function errorMessage(code: string): string {
  switch (code) {
    case "outside_coverage":
      return "Lokasi Anda berada di luar wilayah yang dipantau pada tahap ini.";
    case "area_not_found":
      return "Kecamatan belum dikenali. Coba nama kecamatan saja, misalnya Cinangka.";
    case "invalid_location":
      return "Koordinat lokasi tidak valid. Coba izinkan lokasi kembali.";
    default:
      return "Data belum dapat dihubungi. Silakan cek sumber resmi di bawah.";
  }
}

export function LookupClient() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const fetchStatus = useCallback(async (
    path: string,
    prefill = false,
    init?: RequestInit,
  ) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(path, { cache: "no-store", ...init });
      const body = (await response.json()) as LookupResult | { error?: string };
      if (!("kind" in body)) {
        setError(errorMessage("error" in body ? body.error ?? "" : ""));
        return null;
      }
      setResult(body);
      if (prefill) setQuery(body.area.name);
      return body;
    } catch {
      setError(errorMessage(""));
      return null;
    } finally {
      setLoading(false);
      setLocating(false);
    }
  }, []);

  const checkByArea = useCallback(
    async (areaName: string) => {
      const cleaned = areaName.trim();
      if (cleaned.length < 3) {
        setError("Tulis nama kecamatan terlebih dahulu.");
        setResult(null);
        return null;
      }
      setQuery(cleaned);
      return fetchStatus(`/api/awasabu/check?area=${encodeURIComponent(cleaned)}`);
    },
    [fetchStatus],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    void checkByArea(query);
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setError("Perangkat ini tidak menyediakan lokasi. Cari kecamatan secara manual.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void fetchStatus("/api/awasabu/check", true, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        });
      },
      (locationError) => {
        setLocating(false);
        const denied = locationError.code === locationError.PERMISSION_DENIED;
        setError(
          denied
            ? "Izin lokasi tidak diberikan. Anda tetap bisa mencari kecamatan secara manual."
            : "Lokasi belum dapat ditemukan. Coba lagi atau cari kecamatan secara manual.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "check_ash_status_by_area",
          title: "Cek status abu per kecamatan",
          description:
            "Cari status informasi abu vulkanik terbaru untuk satu kecamatan yang dipantau Awas Abu.",
          inputSchema: {
            type: "object",
            properties: {
              area: { type: "string", minLength: 3, maxLength: 100 },
            },
            required: ["area"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          async execute(input) {
            const area =
              input && typeof input === "object" && "area" in input
                ? String((input as { area: unknown }).area).trim()
                : "";
            if (area.length < 3 || area.length > 100) {
              throw new Error("Nama kecamatan harus terdiri dari 3–100 karakter.");
            }
            const found = await checkByArea(area);
            if (!found) throw new Error("Status wilayah tidak ditemukan.");
            return {
              kind: found.kind,
              area: found.area.name,
              level: found.status?.level ?? null,
              headline: found.status?.headline ?? null,
              source_url: found.status?.source_url ?? null,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [checkByArea]);

  return (
    <section className="lookup-panel" aria-label="Pemeriksaan wilayah" aria-busy={loading}>
      <div className="lookup-controls">
        <button className="location-button" type="button" onClick={locate} disabled={locating || loading}>
          <span aria-hidden="true">⌖</span>
          {locating ? "Mencari lokasi…" : "Gunakan lokasi saya"}
        </button>
        <p className="privacy-note">Browser akan meminta izin. Koordinat tidak disimpan.</p>
        <div className="divider" aria-hidden="true"><span>atau</span></div>
        <form onSubmit={submit} className="search-form">
          <label htmlFor="area-search">Nama kecamatan</label>
          <div className="search-row">
            <input
              id="area-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Contoh: Cinangka"
              autoComplete="address-level3"
              maxLength={100}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading && !locating ? "Memeriksa…" : "Cek status"}
            </button>
          </div>
        </form>
        <div className="quick-areas" aria-label="Contoh wilayah">
          {['Cinangka', 'Kalianda', 'Anyar'].map((area) => (
            <button key={area} type="button" onClick={() => void checkByArea(area)} disabled={loading}>
              {area}
            </button>
          ))}
        </div>
      </div>

      <ResultPanel result={result} error={error} loading={loading} />
    </section>
  );
}

function ResultPanel({
  result,
  error,
  loading,
}: {
  result: LookupResult | null;
  error: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="result-empty result-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <div><strong>Memeriksa informasi terbaru</strong><p>Mohon tunggu sebentar.</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-empty result-error" role="alert">
        <span className="empty-icon" aria-hidden="true">×</span>
        <div><strong>Status belum dapat ditampilkan</strong><p>{error}</p></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-empty" aria-live="polite">
        <span className="empty-icon" aria-hidden="true">◎</span>
        <div><strong>Belum ada wilayah dipilih</strong><p>Bagikan lokasi atau cari kecamatan untuk melihat informasi terbaru.</p></div>
      </div>
    );
  }

  if (result.kind === "no_data") {
    return (
      <article className="status-result status-no-data" aria-live="polite">
        <div className="status-label"><span aria-hidden="true">?</span> BELUM ADA DATA</div>
        <AreaHeading area={result.area} />
        <p className="status-headline">Belum ada informasi abu vulkanik untuk wilayah ini.</p>
        <p className="safety-warning"><strong>Ini bukan berarti wilayah Anda aman.</strong> Periksa sumber resmi sebelum mengambil keputusan.</p>
        <OfficialLinks />
      </article>
    );
  }

  if (result.kind === "service_unavailable") {
    return (
      <article className="status-result status-no-data" aria-live="polite">
        <div className="status-label"><span aria-hidden="true">!</span> DATA BELUM TERHUBUNG</div>
        <AreaHeading area={result.area} />
        <p className="status-headline">Kecamatan ditemukan, tetapi informasi abu terbaru belum dapat diambil.</p>
        <p className="safety-warning"><strong>Jangan anggap wilayah aman.</strong> Periksa sumber resmi sebelum mengambil keputusan.</p>
        <OfficialLinks />
      </article>
    );
  }

  const { status, area } = result;
  const stale = result.kind === "stale";
  const guidance = stale ? null : getSafetyGuidance(status.level);
  return (
    <article className={`status-result status-${stale ? "stale" : status.level.toLowerCase().replace('_', '-')}`} aria-live="polite">
      {stale ? (
        <div className="status-label"><span aria-hidden="true">!</span> DATA LAMA</div>
      ) : (
        <div className="status-label"><span aria-hidden="true">{LEVEL_ICON[status.level]}</span> {LEVEL_LABEL[status.level]}</div>
      )}
      <AreaHeading area={area} />
      {stale && <p className="stale-level">Status terakhir: {LEVEL_LABEL[status.level]}</p>}
      {!stale && (
        <p className="freshness-note">
          Diperbarui {status.age_minutes < 1 ? "kurang dari 1 menit" : `${status.age_minutes} menit`} lalu
        </p>
      )}
      <p className="status-headline">{status.headline}</p>
      {status.scope_basis === "province_mention_assumption" && (
        <p className="scope-assumption">
          <strong>Cakupan berdasarkan asumsi provinsi.</strong> Sumber menyebut
          provinsi ini, sehingga semua wilayah Phase 0 yang dipantau ikut
          ditandai. Ini bukan konfirmasi abu di permukaan pada setiap kecamatan.
        </p>
      )}
      {status.actions.length > 0 && (
        <section className="official-actions" aria-labelledby="official-actions-title">
          <h3 id="official-actions-title">Arahan resmi untuk {area.name}</h3>
          <ul className="action-list">
            {status.actions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </section>
      )}
      {guidance && <SafetyGuide guidance={guidance} />}
      {stale && (
        <p className="safety-warning"><strong>Informasi ini telah kedaluwarsa.</strong> Jangan jadikan dasar keputusan saat ini.</p>
      )}
      <div className="source-block">
        <span>Sumber</span>
        <a href={status.source_url} target="_blank" rel="noreferrer">{status.source_name} ↗</a>
        <small>Data per {formatWib(status.observed_at)}</small>
      </div>
      {!stale && <ShareButton area={area} status={status} />}
    </article>
  );
}

function SafetyGuide({ guidance }: { guidance: NonNullable<ReturnType<typeof getSafetyGuidance>> }) {
  return (
    <section className="safety-guide" aria-labelledby="safety-guide-title">
      <div className="safety-guide-heading">
        <span aria-hidden="true">!</span>
        <div>
          <h3 id="safety-guide-title">{guidance.title}</h3>
          <p>{guidance.summary}</p>
        </div>
      </div>
      <ol className="safety-steps">
        {guidance.steps.map((step, index) => (
          <li key={step.title}>
            <span className="step-number" aria-hidden="true">{index + 1}</span>
            <div><strong>{step.title}</strong><p>{step.detail}</p></div>
          </li>
        ))}
      </ol>
      <p className="medical-alert"><strong>Butuh bantuan medis?</strong> {guidance.medical}</p>
      <p className="official-rule">Evakuasi hanya mengikuti perintah resmi pemerintah, BPBD, atau PVMBG.</p>
    </section>
  );
}

function AreaHeading({ area }: { area: PublicArea }) {
  return (
    <div className="area-heading">
      <h2>{area.name}</h2>
      <p>{area.regency}, {area.province} · sekitar {area.distance_km} km dari Anak Krakatau</p>
      <AreaMap area={area} />
    </div>
  );
}

function AreaMap({ area }: { area: PublicArea }) {
  const [visible, setVisible] = useState(false);
  const { lat, lng } = area.map_center;
  const delta = 0.08;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=11/${lat}/${lng}`;

  if (!visible) {
    return (
      <button className="map-toggle" type="button" onClick={() => setVisible(true)}>
        Tampilkan peta kecamatan
      </button>
    );
  }

  return (
    <div className="area-map">
      <iframe title={`Peta pusat Kecamatan ${area.name}`} src={mapUrl} loading="lazy" />
      <p>Peta menunjukkan pusat kecamatan, bukan posisi GPS Anda. Peta dimuat dari OpenStreetMap.</p>
      <a href={fullMapUrl} target="_blank" rel="noreferrer">Buka peta lebih besar ↗</a>
    </div>
  );
}

function OfficialLinks() {
  return (
    <div className="official-links">
      <a href="https://magma.esdm.go.id/" target="_blank" rel="noreferrer">MAGMA Indonesia ↗</a>
      <a href="https://www.bmkg.go.id/" target="_blank" rel="noreferrer">BMKG ↗</a>
      <a href="https://bnpb.go.id/" target="_blank" rel="noreferrer">BNPB ↗</a>
    </div>
  );
}

function ShareButton({ area, status }: { area: PublicArea; status: PublicStatus }) {
  const guidance = getSafetyGuidance(status.level);
  const sharedActions = status.actions.length
    ? status.actions.slice(0, 3)
    : guidance?.steps.slice(0, 3).map((step) => `${step.title}: ${step.detail}`) ?? [];
  const shareText = [
    `${LEVEL_LABEL[status.level]} — ${area.name}, ${area.regency}`,
    status.headline,
    status.scope_basis === "province_mention_assumption"
      ? "Catatan: cakupan wilayah dibuat dari penyebutan provinsi; bukan konfirmasi abu di permukaan pada setiap kecamatan."
      : "",
    sharedActions.length ? `Tindakan:\n${sharedActions.map((action) => `• ${action}`).join("\n")}` : "",
    `Sumber: ${status.source_name}`,
    status.source_url,
    `Data per ${formatWib(status.observed_at)}`,
  ].filter(Boolean).join("\n\n");
  return (
    <a className="share-button" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
      Bagikan ke WhatsApp ↗
    </a>
  );
}
