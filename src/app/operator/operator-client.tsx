"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  inferProvinceImpactAssumptions,
  type ScopeBasis,
} from "@/lib/awasabu/impact-scope";

type OperatorArea = {
  code: string;
  name: string;
  regency: string;
  province: string;
};

const SOURCE_LINKS = [
  ["MAGMA / PVMBG", "https://magma.esdm.go.id/"],
  ["Badan Geologi", "https://geologi.esdm.go.id/sbg"],
  ["Citra abu BMKG", "https://www.bmkg.go.id/cuaca/satelit/citra-sebaran-abu-vulkanik"],
  ["BNPB", "https://bnpb.go.id/"],
] as const;

function localDateTimeValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function OperatorClient({ areas }: { areas: OperatorArea[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState("");
  const [headline, setHeadline] = useState("");
  const [actions, setActions] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [observedAt, setObservedAt] = useState(localDateTimeValue);
  const [validMinutes, setValidMinutes] = useState("180");
  const [sourceText, setSourceText] = useState("");
  const [scopeBasis, setScopeBasis] = useState<ScopeBasis>("operator_selected");
  const [assumedProvinces, setAssumedProvinces] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const groups = useMemo(() => {
    const grouped = new Map<string, OperatorArea[]>();
    for (const area of areas) {
      const label = `${area.province} — ${area.regency}`;
      grouped.set(label, [...(grouped.get(label) ?? []), area]);
    }
    return [...grouped.entries()];
  }, [areas]);

  function toggleArea(code: string) {
    setSelected((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );
  }

  function applyProvinceAssumption() {
    const assumptions = inferProvinceImpactAssumptions(sourceText, areas);
    if (!assumptions.length) {
      setSelected([]);
      setScopeBasis("operator_selected");
      setAssumedProvinces([]);
      setMessage({
        kind: "error",
        text: "Tidak ada nama provinsi cakupan yang ditemukan. Pilih wilayah secara manual.",
      });
      return;
    }

    setSelected([
      ...new Set(assumptions.flatMap((assumption) => assumption.area_codes)),
    ]);
    setScopeBasis("province_mention_assumption");
    setAssumedProvinces(assumptions.map((assumption) => assumption.province));
    setMessage(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!selected.length) {
      setMessage({ kind: "error", text: "Pilih sedikitnya satu wilayah." });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/awasabu/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areas: selected,
          level,
          headline,
          actions: actions.split("\n").map((line) => line.trim()).filter(Boolean),
          source_name: sourceName,
          source_url: sourceUrl,
          observed_at: new Date(observedAt).toISOString(),
          valid_minutes: Number(validMinutes),
          scope_basis: scopeBasis,
          operator: "web-operator",
        }),
      });
      const body = await response.json() as { inserted?: number; expires_at?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Gagal menerbitkan buletin");
      setMessage({
        kind: "ok",
        text: `${body.inserted ?? selected.length} wilayah diperbarui. Status akan kedaluwarsa otomatis sesuai masa berlaku.`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Gagal menerbitkan buletin.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="operator-form" onSubmit={submit}>
      <section className="operator-card">
        <h2>1. Periksa sumber</h2>
        <div className="source-shortcuts">
          {SOURCE_LINKS.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noreferrer">{label} ↗</a>)}
        </div>
        <div className="operator-grid two-columns">
          <label>Nama sumber<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Contoh: BMKG" required maxLength={100} /></label>
          <label>Tautan buletin resmi<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://www.bmkg.go.id/..." required /></label>
        </div>
      </section>

      <section className="operator-card">
        <h2>2. Salin isi buletin</h2>
        <div className="operator-grid two-columns">
          <label>Level<select value={level} onChange={(event) => setLevel(event.target.value)} required><option value="">Pilih dari buletin</option><option value="AMAN">AMAN — resmi di luar jalur abu</option><option value="WASPADA">WASPADA — abu mungkin mencapai wilayah</option><option value="AWAS_ABU">AWAS ABU — terjadi atau segera terjadi</option><option value="BAHAYA">BAHAYA — ada perintah resmi</option></select></label>
          <label>Waktu pengamatan<input type="datetime-local" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} required /></label>
          <label>Masa berlaku<select value={validMinutes} onChange={(event) => setValidMinutes(event.target.value)}><option value="60">1 jam</option><option value="180">3 jam</option><option value="360">6 jam</option></select></label>
        </div>
        <label>Judul peringatan<textarea value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Salin ringkasan faktual dari buletin" required maxLength={500} rows={3} /></label>
        <label>Tindakan resmi — satu per baris<textarea value={actions} onChange={(event) => setActions(event.target.value)} placeholder={"Gunakan masker bila keluar rumah\nTutup sumber air bersih"} maxLength={2000} rows={5} /></label>
      </section>

      <fieldset className="operator-card area-picker">
        <legend>3. Tentukan cakupan wilayah</legend>
        <div className="province-assumption-tool">
          <label>
            Teks sumber untuk pemetaan provinsi — tidak disimpan
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Tempel bagian sumber resmi yang menyebut wilayah"
              rows={5}
            />
          </label>
          <button type="button" onClick={applyProvinceAssumption}>
            Terapkan asumsi provinsi
          </button>
          <p>
            Jika nama provinsi disebut, semua wilayah Phase 0 yang dipantau di
            provinsi itu akan dipilih. Ini asumsi cakupan, bukan konfirmasi abu
            di permukaan.
          </p>
          {assumedProvinces.length > 0 && (
            <div className="assumption-result" role="status">
              Asumsi diterapkan: {assumedProvinces.join(", ")} — {selected.length} wilayah dipilih.
            </div>
          )}
        </div>
        <p className="operator-help">Periksa kembali setiap pilihan sebelum menerbitkan.</p>
        {groups.map(([label, group]) => (
          <div className="area-group" key={label}>
            <h3>{label}</h3>
            <div className="area-options">
              {group.map((area) => (
                <label key={area.code}>
                  <input type="checkbox" checked={selected.includes(area.code)} onChange={() => toggleArea(area.code)} />
                  <span>{area.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="publish-row">
        <button type="submit" disabled={submitting}>{submitting ? "Menerbitkan…" : `Terbitkan ke ${selected.length} wilayah`}</button>
        <p>BAHAYA hanya boleh menyalin perintah pemerintah atau petugas berwenang.</p>
      </div>
      {message && <div className={`operator-message ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</div>}
    </form>
  );
}
