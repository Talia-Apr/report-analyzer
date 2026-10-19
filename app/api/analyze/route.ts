import { NextResponse } from "next/server";
import { GROQ_BASE, MODEL } from "@/lib/config";
import type { AnalysisResult, Lang } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // detik, batas waktu fungsi di Vercel

interface AnalyzeBody {
  report?: unknown;
  language?: unknown;
}

// Bentuk respons Groq yang kita pakai
interface GroqChatResponse {
  model?: string;
  choices: { message: { content: string } }[];
}

// Bentuk mentah JSON dari AI (belum tentu valid, jadi semua unknown)
interface RawAnalysis {
  summary?: unknown;
  key_issues?: unknown;
  metrics?: {
    production_units?: unknown;
    reject_units?: unknown;
    downtime_minutes?: unknown;
  };
  action_items?: unknown;
}

// Pesan error mengikuti bahasa yang dipilih pengguna
const ERR: Record<Lang, Record<string, string>> = {
  id: {
    short: "Laporan terlalu pendek. Tulis minimal satu kalimat.",
    long: "Laporan terlalu panjang (maks. 8000 karakter).",
    noKey: "GROQ_API_KEY belum diatur. Isi di .env.local (lokal) atau Environment Variables (Vercel).",
    upstream: "Layanan AI gagal merespons. Coba lagi sebentar.",
    timeout: "Permintaan ke AI terlalu lama. Coba lagi.",
    fail: "Gagal menganalisis laporan.",
  },
  en: {
    short: "Report is too short. Write at least one sentence.",
    long: "Report is too long (max. 8000 characters).",
    noKey: "GROQ_API_KEY is not set. Add it to .env.local (local) or Environment Variables (Vercel).",
    upstream: "The AI service failed to respond. Please try again shortly.",
    timeout: "The AI request took too long. Please try again.",
    fail: "Failed to analyze the report.",
  },
};

function buildSystemPrompt(language: Lang): string {
  const lang = language === "en" ? "English" : "Bahasa Indonesia";
  return `You analyze plain-text operational reports (production, machine issues, rejects, daily activities).
Return ONLY a JSON object with exactly this shape:
{
  "summary": string,            // 1-2 sentences of what happened
  "key_issues": string[],       // problems found (machine downtime, defects, delays). Empty array if none.
  "metrics": {
    "production_units": number | null,  // total units produced
    "reject_units": number | null,      // total rejected units
    "downtime_minutes": number | null   // total downtime in minutes (sum all machines)
  },
  "action_items": string[]      // concrete follow-up actions, short and specific
}
Rules:
- Use ONLY facts in the report. Never invent numbers, machines, or causes.
- If a number is not stated, use null.
- Write all text fields in ${lang}, regardless of the language the report is written in.`;
}

// Buang blok <think>...</think> lalu ambil JSON-nya
function extractJson(text: string): RawAnalysis {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Respons AI bukan JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as RawAnalysis;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export async function POST(req: Request) {
  let body: AnalyzeBody = {};
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    // body kosong atau bukan JSON: ditangani validasi di bawah
  }

  const language: Lang = body.language === "en" ? "en" : "id";
  const E = ERR[language];
  const report = body.report;

  if (typeof report !== "string" || report.trim().length < 10) {
    return NextResponse.json({ error: E.short }, { status: 400 });
  }
  if (report.length > 8000) {
    return NextResponse.json({ error: E.long }, { status: 400 });
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: E.noKey }, { status: 500 });
  }

  try {
    const t0 = Date.now();
    const groqRes = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(language) },
          { role: "user", content: report.trim() },
        ],
      }),
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });

    if (!groqRes.ok) {
      const detail = await groqRes.text();
      console.error("Groq error:", groqRes.status, detail);
      return NextResponse.json({ error: E.upstream }, { status: 502 });
    }

    const data = (await groqRes.json()) as GroqChatResponse;
    const parsed = extractJson(data.choices[0].message.content);

    const production = num(parsed.metrics?.production_units);
    const reject = num(parsed.metrics?.reject_units);
    const downtime = num(parsed.metrics?.downtime_minutes);

    // Dihitung di server, bukan oleh AI, supaya angkanya akurat.
    const rejectRate = production && reject !== null ? round2((reject / production) * 100) : null;

    const result: AnalysisResult = {
      summary: String(parsed.summary ?? ""),
      key_issues: strList(parsed.key_issues),
      metrics: {
        production_units: production,
        reject_units: reject,
        downtime_minutes: downtime,
        reject_rate: rejectRate,
      },
      action_items: strList(parsed.action_items),
      meta: {
        provider: "Groq",
        model: data.model || MODEL, // nama model yang dikembalikan Groq sendiri
        latency_ms: Date.now() - t0,
      },
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json({ error: timedOut ? E.timeout : E.fail }, { status: 500 });
  }
}