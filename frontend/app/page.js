"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SAMPLE = {
  id: "Produksi hari ini mencapai 350 unit. Terdapat 12 produk reject. Mesin A mengalami downtime selama 45 menit karena masalah pada komponen mesin.",
  en: "Production today reached 350 units. There were 12 rejected products. Machine A experienced 45 minutes of downtime due to a machine component issue.",
};

const LABELS = {
  id: {
    summary: "Ringkasan", issues: "Kendala utama", actions: "Tindak lanjut",
    production: "Produksi", reject: "Reject", rate: "Reject rate", downtime: "Downtime",
    unit: "unit", min: "menit", none: "Tidak ada kendala dilaporkan.",
  },
  en: {
    summary: "Summary", issues: "Key issues", actions: "Action items",
    production: "Production", reject: "Rejects", rate: "Reject rate", downtime: "Downtime",
    unit: "units", min: "min", none: "No issues reported.",
  },
};

const fmt = (v) => (v === null || v === undefined ? "–" : `${v}`);

function toPlainText(r, L) {
  const m = r.metrics;
  const list = (arr, empty) => (arr.length ? arr.map((x) => `- ${x}`).join("\n") : `- ${empty}`);
  return [
    `${L.summary}: ${r.summary}`,
    `${L.issues}:\n${list(r.key_issues, L.none)}`,
    `${L.rate}: ${m.reject_rate === null ? "–" : m.reject_rate.toFixed(2) + "%"}`,
    `${L.actions}:\n${list(r.action_items, "–")}`,
  ].join("\n\n");
}

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const [report, setReport] = useState("");
  const [lang, setLang] = useState("id");
  const [result, setResult] = useState(null);
  const [resultLang, setResultLang] = useState("id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const L = LABELS[resultLang];

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan.");
      setResult(data);
      setResultLang(lang);
    } catch (e) {
      setError(
        e.message === "Failed to fetch"
          ? "Backend tidak terjangkau. Pastikan server berjalan di " + API
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(toPlainText(result, L));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const btn =
    "rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Analisis laporan operasional</h1>
        <p className="mt-2 text-mute">
          Tempel laporan shift atau laporan harian. Hasilnya dirangkum menjadi masalah, angka penting, dan tindak lanjut.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* 1. Input laporan */}
        <section aria-labelledby="in" className="flex flex-col">
          <label id="in" htmlFor="report" className="mb-2 text-sm font-medium">
            Laporan
          </label>
          <textarea
            id="report"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={11}
            placeholder="Contoh: Produksi hari ini mencapai 350 unit. Terdapat 12 produk reject…"
            className="w-full resize-y rounded-md border border-rule bg-sheet p-4 leading-relaxed placeholder:text-mute/70 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Bahasa hasil" className="flex overflow-hidden rounded-md border border-rule text-sm">
              {["id", "en"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`px-3 py-2 ${lang === l ? "bg-ink text-sheet" : "bg-sheet text-mute hover:text-ink"}`}
                >
                  {l === "id" ? "Indonesia" : "English"}
                </button>
              ))}
            </div>
            <button onClick={() => setReport(SAMPLE[lang])} className={`${btn} text-steel hover:bg-steel/10`}>
              Isi contoh
            </button>
            <button
              onClick={analyze}
              disabled={loading || report.trim().length < 10}
              className={`${btn} ml-auto bg-steel text-white hover:bg-steel/90 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {loading ? "Menganalisis…" : "Analisis laporan"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-md border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
              {error}
            </p>
          )}
        </section>

        {/* 2 & 3. Hasil terstruktur */}
        <section aria-live="polite" className="rounded-md border border-rule bg-sheet">
          {!result ? (
            <div className="flex min-h-[20rem] flex-col items-center justify-center px-8 text-center">
              <p className="font-medium">Belum ada hasil</p>
              <p className="mt-1 max-w-xs text-sm text-mute">
                Tempel laporan di kiri, lalu klik Analisis laporan.
              </p>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 divide-x divide-y divide-rule border-b border-rule sm:grid-cols-4 sm:divide-y-0">
                {[
                  [L.production, fmt(result.metrics.production_units), L.unit],
                  [L.reject, fmt(result.metrics.reject_units), L.unit],
                  [L.rate, result.metrics.reject_rate === null ? "–" : result.metrics.reject_rate.toFixed(2), "%"],
                  [L.downtime, fmt(result.metrics.downtime_minutes), L.min],
                ].map(([label, value, unit]) => (
                  <div key={label} className="px-4 py-4">
                    <dt className="text-xs text-mute">{label}</dt>
                    <dd className="mt-1 font-mono text-2xl">
                      {value}
                      {value !== "–" && <span className="ml-1 font-sans text-xs text-mute">{unit}</span>}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="space-y-6 p-5">
                <div>
                  <h2 className="text-sm font-semibold">{L.summary}</h2>
                  <p className="mt-1 leading-relaxed">{result.summary}</p>
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{L.issues}</h2>
                  {result.key_issues.length ? (
                    <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed marker:text-amber">
                      {result.key_issues.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1 text-mute">{L.none}</p>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{L.actions}</h2>
                  <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed marker:text-steel">
                    {result.action_items.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              </div>

              {/* 4. Salin / ekspor */}
              <div className="flex flex-wrap gap-2 border-t border-rule px-5 py-3">
                <button onClick={copy} className={`${btn} border border-rule hover:bg-floor`}>
                  {copied ? "Tersalin" : "Salin hasil"}
                </button>
                <button
                  onClick={() => download("analisis-laporan.txt", toPlainText(result, L), "text/plain")}
                  className={`${btn} border border-rule hover:bg-floor`}
                >
                  Unduh .txt
                </button>
                <button
                  onClick={() => download("analisis-laporan.json", JSON.stringify(result, null, 2), "application/json")}
                  className={`${btn} border border-rule hover:bg-floor`}
                >
                  Unduh .json
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
