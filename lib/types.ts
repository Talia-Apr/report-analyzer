export type Lang = "id" | "en";
export type Theme = "light" | "dark";

export interface AnalysisResult {
  summary: string;
  key_issues: string[];
  metrics: {
    production_units: number | null;
    reject_units: number | null;
    downtime_minutes: number | null;
    reject_rate: number | null;
  };
  action_items: string[];
  meta?: { provider: string; model: string; latency_ms: number };
}

// Respons dari GET /api/health
export interface HealthResponse {
  online: boolean;
  model: string;
  modelAvailable?: boolean;
  latencyMs?: number;
  reason?: string;
  httpStatus?: number;
}

// Status yang ditampilkan di lampu indikator
export interface Status {
  state: "checking" | "online" | "model-missing" | "offline";
  model?: string | null;
  latencyMs?: number;
  reason?: string;
  httpStatus?: number;
}
