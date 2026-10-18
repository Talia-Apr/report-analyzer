"use client";

import { useState, useEffect, useRef } from "react";
import type { AnalysisResult, HealthResponse, Lang, Status, Theme } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/* ---------- Teks antarmuka (ID / EN) ---------- */
const id = {
  pageTitle: "Analisis Laporan Operasional",
  title: "Analisis laporan operasional",
  subtitle:
    "Tempel laporan shift atau laporan harian. Hasilnya dirangkum menjadi masalah, angka penting, dan tindak lanjut.",
  languageLabel: "Bahasa",
  themeLabel: "Tema",
  themeLight: "",
  themeDark: "",
  reportLabel: "Laporan",
  placeholder: "Contoh: Produksi hari ini mencapai 350 unit. Terdapat 12 produk reject…",
  samples: "Isi contoh",
  analyze: "Analisis laporan",
  analyzing: "Menganalisis…",
  emptyTitle: "Belum ada hasil",
  emptyBody: "Tempel laporan, lalu klik Analisis laporan.",
  summary: "Ringkasan",
  issues: "Kendala utama",
  actions: "Tindak lanjut",
  production: "Produksi",
  reject: "Reject",
  rate: "Reject rate",
  downtime: "Downtime",
  unit: "unit",
  min: "menit",
  sec: "dtk",
  none: "Tidak ada kendala dilaporkan.",
  noActions: "Tidak ada tindak lanjut.",
  copy: "Salin hasil",
  copied: "Tersalin",
  txt: "Unduh .txt",
  json: "Unduh .json",
  fileName: "analisis-laporan",
  analyzedBy: "Dianalisis oleh",
  networkError: (api: string) => `Backend tidak terjangkau. Pastikan server berjalan di ${api}`,
  genericError: "Terjadi kesalahan.",
  st: {
    checking: "Memeriksa koneksi Groq…",
    online: "Groq API online",
    modelMissing: "Groq online, model tidak ditemukan",
    offline: "Groq API offline",
    backend: "Backend tidak terjangkau",
    noKey: "API key belum diatur",
    invalidKey: "API key tidak valid",
    groqStatus: (n?: number) => `Groq merespons ${n ?? ""}`.trim(),
    unreachable: "Tidak dapat terhubung ke Groq",
  },
};

type Strings = typeof id;

// Dengan tipe Strings, TypeScript akan menandai error jika ada kunci terjemahan yang terlewat.
const en: Strings = {
  pageTitle: "Operational Report Analyzer",
  title: "Operational report analyzer",
  subtitle: "Paste a shift or daily report. It gets summarized into issues, key numbers, and follow-up actions.",
  languageLabel: "Language",
  themeLabel: "Theme",
  themeLight: "",
  themeDark: "",
  reportLabel: "Report",
  placeholder: "Example: Production today reached 350 units. There were 12 rejected products…",
  samples: "Load example",
  analyze: "Analyze report",
  analyzing: "Analyzing…",
  emptyTitle: "No results yet",
  emptyBody: "Paste a report, then click Analyze report.",
  summary: "Summary",
  issues: "Key issues",
  actions: "Action items",
  production: "Production",
  reject: "Rejects",
  rate: "Reject rate",
  downtime: "Downtime",
  unit: "units",
  min: "min",
  sec: "s",
  none: "No issues reported.",
  noActions: "No action items.",
  copy: "Copy result",
  copied: "Copied",
  txt: "Download .txt",
  json: "Download .json",
  fileName: "report-analysis",
  analyzedBy: "Analyzed by",
  networkError: (api: string) => `Backend unreachable. Make sure the server is running at ${api}`,
  genericError: "Something went wrong.",
  st: {
    checking: "Checking Groq connection…",
    online: "Groq API online",
    modelMissing: "Groq online, model not found",
    offline: "Groq API offline",
    backend: "Backend unreachable",
    noKey: "API key not set",
    invalidKey: "Invalid API key",
    groqStatus: (n?: number) => `Groq responded ${n ?? ""}`.trim(),
    unreachable: "Cannot reach Groq",
  },
};

const STR: Record<Lang, Strings> = { id, en };

/* ---------- Contoh laporan ---------- */
interface Sample {
  title: Record<Lang, string>;
  text: Record<Lang, string>;
}

const SAMPLES: Sample[] = [
  {
    title: { id: "Laporan sederhana", en: "Simple report" },
    text: {
      id: "Produksi hari ini mencapai 350 unit. Terdapat 12 produk reject. Mesin A mengalami downtime selama 45 menit karena masalah pada komponen mesin.",
      en: "Production today reached 350 units. There were 12 rejected products. Machine A experienced 45 minutes of downtime due to a machine component issue.",
    },
  },
  {
    title: { id: "Beberapa mesin bermasalah", en: "Multiple machine issues" },
    text: {
      id: "Laporan shift pagi: total produksi 1200 unit, reject 36 unit. Mesin A berhenti 20 menit untuk penggantian oli. Mesin C berhenti 55 menit karena belt putus. Operator melaporkan suhu ruang produksi cukup tinggi sejak pukul 10.00.",
      en: "Morning shift report: total production 1200 units, 36 rejects. Machine A stopped for 20 minutes for an oil change. Machine C stopped for 55 minutes due to a broken belt. Operators reported high temperature in the production area since 10:00.",
    },
  },
  {
    title: { id: "Tanpa kendala", en: "No issues" },
    text: {
      id: "Produksi hari ini 800 unit dengan 8 produk reject. Seluruh mesin berjalan normal tanpa downtime. Pengiriman ke gudang selesai tepat waktu.",
      en: "Production today was 800 units with 8 rejects. All machines ran normally with no downtime. Warehouse delivery was completed on time.",
    },
  },
  {
    title: { id: "Dua lini produksi", en: "Two production lines" },
    text: {
      id: "Lini 1 memproduksi 450 unit dengan 9 reject dan downtime 10 menit. Lini 2 memproduksi 380 unit dengan 19 reject. Lini 2 berhenti selama 1 jam 15 menit karena bahan baku terlambat datang dari gudang.",
      en: "Line 1 produced 450 units with 9 rejects and 10 minutes of downtime. Line 2 produced 380 units with 19 rejects. Line 2 stopped for 1 hour 15 minutes because raw materials arrived late from the warehouse.",
    },
  },
  {
    title: { id: "Tanpa angka produksi", en: "No production numbers" },
    text: {
      id: "Hari ini tim maintenance melakukan pembersihan rutin pada mesin pengemasan dan memeriksa kalibrasi timbangan. Ada keluhan operator soal lampu penerangan area packing yang redup. Briefing keselamatan kerja dilakukan pukul 07.30.",
      en: "Today the maintenance team did routine cleaning on the packaging machine and checked the scale calibration. Operators complained about dim lighting in the packing area. A safety briefing was held at 07:30.",
    },
  },
];

/* ---------- Helper ---------- */
const locale = (lang: Lang): string => (lang === "id" ? "id-ID" : "en-US");

const fmtDec = (v: number, lang: Lang, digits: number): string =>
  new Intl.NumberFormat(locale(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

const fmt = (v: number | null | undefined): string => (v === null || v === undefined ? "–" : `${v}`);

function reasonText(st: Status, S: Strings): string {
  switch (st.reason) {
    case "backend": return S.st.backend;
    case "no_key": return S.st.noKey;
    case "invalid_key": return S.st.invalidKey;
    case "groq_status": return S.st.groqStatus(st.httpStatus);
    case "unreachable": return S.st.unreachable;
    default: return S.st.offline;
  }
}

function toPlainText(r: AnalysisResult, R: Strings, lang: Lang): string {
  const m = r.metrics;
  const list = (arr: string[], empty: string) => (arr.length ? arr.map((x) => `- ${x}`).join("\n") : `- ${empty}`);
  const rate = m.reject_rate === null ? "–" : `${fmtDec(m.reject_rate, lang, 2)}%`;
  return [
    `${R.summary}: ${r.summary}`,
    `${R.issues}:\n${list(r.key_issues, R.none)}`,
    `${R.rate}: ${rate}`,
    `${R.actions}:\n${list(r.action_items, R.noActions)}`,
  ].join("\n\n");
}

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Ikon tema ---------- */
function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/* ---------- Halaman ---------- */
export default function Page() {
  const [lang, setLang] = useState<Lang>("id");
  const [theme, setTheme] = useState<Theme>("light");
  const [report, setReport] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultLang, setResultLang] = useState<Lang>("id");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [samplesOpen, setSamplesOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>({ state: "checking" });
  const [menuPos, setMenuPos] = useState<{ up: boolean; maxH: number }>({ up: false, maxH: 400 });
  const menuRef = useRef<HTMLDivElement>(null);
  const reqId = useRef<number>(0);

  const S = STR[lang]; // teks antarmuka (bahasa terpilih)
  const R = STR[resultLang]; // teks panel hasil (bahasa saat hasil dibuat)

  // Ingat pilihan bahasa
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "id" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  // Baca tema yang sudah dipasang oleh skrip di layout
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // Sinkronkan <html lang> dan judul tab
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = STR[lang].pageTitle;
  }, [lang]);

  // Cek status Groq tiap 30 detik
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const res = await fetch(`${API}/api/health`);
        const d = (await res.json()) as HealthResponse;
        if (!alive) return;
        setStatus({
          state: !d.online ? "offline" : d.modelAvailable === false ? "model-missing" : "online",
          model: d.model,
          latencyMs: d.latencyMs,
          reason: d.reason,
          httpStatus: d.httpStatus,
        });
      } catch {
        if (alive) setStatus({ state: "offline", reason: "backend", model: null });
      }
    }
    check();
    const timer = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Tutup menu contoh
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setSamplesOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSamplesOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const statusView: Record<Status["state"], { dot: string; text: string }> = {
    checking: { dot: "bg-mute", text: S.st.checking },
    online: { dot: "bg-green-600", text: S.st.online },
    "model-missing": { dot: "bg-amber", text: S.st.modelMissing },
    offline: { dot: "bg-red-600", text: reasonText(status, S) },
  };
  const sv = statusView[status.state];

  async function analyze(text: string = report, language: Lang = lang): Promise<void> {
    const myId = ++reqId.current;
    const T = STR[language];
    setLoading(true);
    setError("");
    try {
      let res: Response;
      try {
        res = await fetch(`${API}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report: text, language }),
        });
      } catch {
        throw new Error(T.networkError(API));
      }
      const data = (await res.json().catch(() => ({}))) as Partial<AnalysisResult> & { error?: string };
      if (!res.ok) throw new Error(data.error || T.genericError);
      if (myId !== reqId.current) return; // ada permintaan yang lebih baru
      setResult(data as AnalysisResult);
      setResultLang(language);
    } catch (e) {
      if (myId === reqId.current) setError(e instanceof Error ? e.message : T.genericError);
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  }

  function changeTheme(next: Theme): void {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  // Buka menu contoh ke arah yang muat di layar (bawah atau atas)
  function toggleSamples(): void {
    if (!samplesOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const up = below < 380 && above > below;
      setMenuPos({ up, maxH: Math.max(160, Math.min(up ? above : below, 420)) });
    }
    setSamplesOpen((o) => !o);
  }

  function changeLang(next: Lang): void {
    if (next === lang) return;
    setLang(next);
    setError("");
    setSamplesOpen(false);
    try {
      localStorage.setItem("lang", next);
    } catch {}

    // Jika isi laporan masih berupa contoh bawaan, ikut diterjemahkan
    let nextReport = report;
    const match = SAMPLES.find((s) => s.text[lang] === report);
    if (match) {
      nextReport = match.text[next];
      setReport(nextReport);
    }
    // Jika sudah ada hasil, analisis ulang agar isi hasil ikut berganti bahasa
    if (result && nextReport.trim().length >= 10) void analyze(nextReport, next);
  }

  async function copy(): Promise<void> {
    if (!result) return;
    await navigator.clipboard.writeText(toPlainText(result, R, resultLang));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const btn =
    "rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel";

  const themeOptions: [Theme, string][] = [
    ["light", S.themeLight],
    ["dark", S.themeDark],
  ];

  const langOptions: [Lang, string][] = [
    ["id", "ID"],
    ["en", "ENG"],
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{S.title}</h1>
          <p className="mt-2 text-mute">{S.subtitle}</p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap justify-end gap-2">
            <div
              role="group"
              aria-label={S.languageLabel}
              className="flex overflow-hidden rounded-md border border-rule text-sm"
            >
              {langOptions.map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => changeLang(code)}
                  aria-pressed={lang === code}
                  className={`px-3 py-2 ${lang === code ? "bg-ink text-sheet" : "bg-sheet text-mute hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label={S.themeLabel}
              className="flex overflow-hidden rounded-md border border-rule text-sm"
            >
              {themeOptions.map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => changeTheme(code)}
                  aria-pressed={theme === code}
                  className={`flex items-center gap-1.5 px-3 py-2 ${
                    theme === code ? "bg-ink text-sheet" : "bg-sheet text-mute hover:text-ink"
                  }`}
                >
                  {code === "light" ? <SunIcon /> : <MoonIcon />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div role="status" className="flex items-center gap-3 rounded-md border border-rule bg-sheet px-4 py-3 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sv.dot}`} aria-hidden="true" />
            <div>
              <p className="font-medium">{sv.text}</p>
              {status.model && (
                <p className="font-mono text-xs text-mute">
                  {status.model}
                  {status.latencyMs ? ` · ${status.latencyMs} ms` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* 1. Input laporan */}
        <section aria-labelledby="in" className="flex flex-col">
          <label id="in" htmlFor="report" className="mb-2 text-sm font-medium">
            {S.reportLabel}
          </label>
          <textarea
            id="report"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={11}
            placeholder={S.placeholder}
            className="w-full resize-y rounded-md border border-rule bg-sheet p-4 leading-relaxed placeholder:text-mute/70 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div ref={menuRef} className="relative">
              <button
                onClick={toggleSamples}
                aria-haspopup="menu"
                aria-expanded={samplesOpen}
                className={`${btn} text-steel hover:bg-steel/10`}
              >
                {S.samples} {samplesOpen ? "▴" : "▾"}
              </button>
              {samplesOpen && (
                <ul
                  role="menu"
                  style={{ maxHeight: menuPos.maxH }}
                  className={`absolute left-0 z-10 w-72 overflow-y-auto rounded-md border border-rule bg-sheet shadow-lg ${
                    menuPos.up ? "bottom-full mb-1" : "top-full mt-1"
                  }`}
                >
                  {SAMPLES.map((s, i) => (
                    <li key={i} role="none">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setReport(s.text[lang]);
                          setSamplesOpen(false);
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-floor"
                      >
                        <span className="font-medium">{s.title[lang]}</span>
                        <span className="mt-0.5 block truncate text-xs text-mute">{s.text[lang]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={() => void analyze()}
              disabled={loading || report.trim().length < 10}
              className={`${btn} ml-auto bg-steel text-onsteel hover:bg-steel/90 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {loading ? S.analyzing : S.analyze}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-md border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
              {error}
            </p>
          )}
        </section>

        {/* 2 & 3. Hasil terstruktur */}
        <section
          aria-live="polite"
          aria-busy={loading}
          className={`rounded-md border border-rule bg-sheet transition-opacity ${loading && result ? "opacity-60" : ""}`}
        >
          {!result ? (
            <div className="flex min-h-[20rem] flex-col items-center justify-center px-8 text-center">
              <p className="font-medium">{S.emptyTitle}</p>
              <p className="mt-1 max-w-xs text-sm text-mute">{S.emptyBody}</p>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 divide-x divide-y divide-rule border-b border-rule sm:grid-cols-4 sm:divide-y-0">
                {(
                  [
                    [R.production, fmt(result.metrics.production_units), R.unit],
                    [R.reject, fmt(result.metrics.reject_units), R.unit],
                    [
                      R.rate,
                      result.metrics.reject_rate === null ? "–" : fmtDec(result.metrics.reject_rate, resultLang, 2),
                      "%",
                    ],
                    [R.downtime, fmt(result.metrics.downtime_minutes), R.min],
                  ] as [string, string, string][]
                ).map(([label, value, unit]) => (
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
                  <h2 className="text-sm font-semibold">{R.summary}</h2>
                  <p className="mt-1 leading-relaxed">{result.summary}</p>
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{R.issues}</h2>
                  {result.key_issues.length ? (
                    <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed marker:text-amber">
                      {result.key_issues.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-mute">{R.none}</p>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{R.actions}</h2>
                  {result.action_items.length ? (
                    <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed marker:text-steel">
                      {result.action_items.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-mute">{R.noActions}</p>
                  )}
                </div>
              </div>

              {/* 4. Salin / ekspor */}
              <div className="flex flex-wrap gap-2 border-t border-rule px-5 py-3">
                <button onClick={() => void copy()} className={`${btn} border border-rule hover:bg-floor`}>
                  {copied ? R.copied : R.copy}
                </button>
                <button
                  onClick={() => download(`${R.fileName}.txt`, toPlainText(result, R, resultLang), "text/plain")}
                  className={`${btn} border border-rule hover:bg-floor`}
                >
                  {R.txt}
                </button>
                <button
                  onClick={() => download(`${R.fileName}.json`, JSON.stringify(result, null, 2), "application/json")}
                  className={`${btn} border border-rule hover:bg-floor`}
                >
                  {R.json}
                </button>
                {result.meta && (
                  <p className="ml-auto self-center text-xs text-mute">
                    {R.analyzedBy} {result.meta.provider} · <span className="font-mono">{result.meta.model}</span> ·{" "}
                    {fmtDec(result.meta.latency_ms / 1000, resultLang, 1)} {R.sec}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}