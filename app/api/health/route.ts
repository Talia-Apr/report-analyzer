import { NextResponse } from "next/server";
import { GROQ_BASE, MODEL } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // jangan di-cache saat build

interface GroqModelsResponse {
  data?: { id: string }[];
}

// Status Groq. "reason" berupa kode; frontend yang menerjemahkannya.
export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ online: false, model: MODEL, reason: "no_key" });
  }

  const t0 = Date.now();
  try {
    const r = await fetch(`${GROQ_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json({
        online: false,
        model: MODEL,
        reason: r.status === 401 ? "invalid_key" : "groq_status",
        httpStatus: r.status,
      });
    }
    const list = (await r.json()) as GroqModelsResponse;
    return NextResponse.json({
      online: true,
      model: MODEL,
      modelAvailable: Array.isArray(list.data) ? list.data.some((m) => m.id === MODEL) : true,
      latencyMs: Date.now() - t0,
    });
  } catch {
    return NextResponse.json({ online: false, model: MODEL, reason: "unreachable" });
  }
}