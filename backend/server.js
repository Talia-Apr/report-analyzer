require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "100kb" }));

function buildSystemPrompt(language) {
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
- Write all text fields in ${lang}.`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

app.get("/api/health", async (_req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.json({ online: false, model: MODEL, reason: "API key belum diatur" });
  }
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return res.json({
        online: false,
        model: MODEL,
        reason: r.status === 401 ? "API key tidak valid" : `Groq merespons ${r.status}`,
      });
    }
    const list = await r.json();
    res.json({
      online: true,
      model: MODEL,
      modelAvailable: Array.isArray(list.data) ? list.data.some((m) => m.id === MODEL) : true,
      latencyMs: Date.now() - t0,
    });
  } catch {
    res.json({ online: false, model: MODEL, reason: "Tidak dapat terhubung ke Groq" });
  }
});

app.post("/api/analyze", async (req, res) => {
  const { report, language = "id" } = req.body || {};

  if (typeof report !== "string" || report.trim().length < 10) {
    return res.status(400).json({ error: "Laporan terlalu pendek. Tulis minimal satu kalimat." });
  }
  if (report.length > 8000) {
    return res.status(400).json({ error: "Laporan terlalu panjang (maks. 8000 karakter)." });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY belum diatur di backend/.env" });
  }

  try {
    const t0 = Date.now();
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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
    });

    if (!groqRes.ok) {
      const detail = await groqRes.text();
      console.error("Groq error:", groqRes.status, detail);
      return res.status(502).json({ error: "Layanan AI gagal merespons. Coba lagi sebentar." });
    }

    const data = await groqRes.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    const m = parsed.metrics || {};
    const production = Number.isFinite(m.production_units) ? m.production_units : null;
    const reject = Number.isFinite(m.reject_units) ? m.reject_units : null;
    const downtime = Number.isFinite(m.downtime_minutes) ? m.downtime_minutes : null;

    // Hitung di server, bukan oleh AI, supaya angkanya akurat.
    const rejectRate =
      production && reject !== null ? round2((reject / production) * 100) : null;

    res.json({
      summary: String(parsed.summary || ""),
      key_issues: Array.isArray(parsed.key_issues) ? parsed.key_issues.map(String) : [],
      meta: {
        provider: "Groq",
        model: data.model || MODEL, // nama model yang dikembalikan Groq sendiri
        latency_ms: Date.now() - t0,
      },
      metrics: {
        production_units: production,
        reject_units: reject,
        downtime_minutes: downtime,
        reject_rate: rejectRate,
      },
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items.map(String) : [],
    });
  } catch (err) {
    console.error(err);
    const timeout = err.name === "TimeoutError";
    res.status(500).json({
      error: timeout ? "Permintaan ke AI terlalu lama. Coba lagi." : "Gagal menganalisis laporan.",
    });
  }
});

app.listen(PORT, () => console.log(`Backend berjalan di http://localhost:${PORT}`));
