import type { ReputationAgentSummary } from "@/lib/reputation-agent";

const DEFAULT_COMPUTE_BASE_URL = "https://router-api.0g.ai/v1";
const DEFAULT_COMPUTE_MODEL = "zai-org/GLM-5-FP8";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  trace?: {
    tee_verified?: boolean;
    teeVerified?: boolean;
  };
  tee_verified?: boolean;
  teeVerified?: boolean;
  model?: string;
};

type ParsedAgentOutput = {
  reputationLabel?: string;
  narrative?: string;
  strongestSignals?: string[];
  nextBestActions?: string[];
  riskNotes?: string[];
};

export class ZeroGComputeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZeroGComputeConfigError";
  }
}

export function hasZeroGComputeConfig() {
  return Boolean(process.env.ZERO_G_COMPUTE_API_KEY);
}

export async function generateReputationWithZeroGCompute(
  summary: ReputationAgentSummary,
): Promise<ReputationAgentSummary> {
  const apiKey = process.env.ZERO_G_COMPUTE_API_KEY;
  if (!apiKey) {
    throw new ZeroGComputeConfigError("ZERO_G_COMPUTE_API_KEY is required for 0G Compute agent inference.");
  }

  const baseUrl = process.env.ZERO_G_COMPUTE_BASE_URL ?? DEFAULT_COMPUTE_BASE_URL;
  const model = process.env.ZERO_G_COMPUTE_MODEL ?? DEFAULT_COMPUTE_MODEL;
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      verify_tee: true,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: [
            "You are ProofPlay's reputation agent.",
            "You evaluate event participation using only the supplied proof records.",
            "Return strict JSON with keys: reputationLabel, narrative, strongestSignals, nextBestActions, riskNotes.",
            "Do not invent proof records, transaction hashes, or media evidence.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Generate a concise portable reputation assessment from these verified proof records.",
            summary,
          }),
        },
      ],
    }),
  });

  const data = (await response.json()) as ChatCompletionResponse & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `0G Compute request failed with status ${response.status}`);
  }

  const rawText = data.choices?.[0]?.message?.content?.trim();
  if (!rawText) {
    throw new Error("0G Compute returned an empty agent response.");
  }

  const parsed = parseAgentJson(rawText);
  const teeVerified = data.trace?.tee_verified ?? data.trace?.teeVerified ?? data.tee_verified ?? data.teeVerified;

  return {
    ...summary,
    agentAssessment: {
      reputationLabel: parsed.reputationLabel ?? summary.agentAssessment.reputationLabel,
      strongestSignals: normalizeList(parsed.strongestSignals, summary.agentAssessment.strongestSignals),
      nextBestActions: normalizeList(parsed.nextBestActions, summary.agentAssessment.nextBestActions),
      narrative: parsed.narrative,
      riskNotes: normalizeList(parsed.riskNotes, []),
    },
    compute: {
      provider: "0G Compute",
      model: data.model ?? model,
      baseUrl,
      teeRequested: true,
      teeVerified,
      mode: "ai_generated",
      generatedAt: new Date().toISOString(),
      rawText,
    },
  };
}

export function attachComputeFallback(
  summary: ReputationAgentSummary,
  error: unknown,
): ReputationAgentSummary {
  const baseUrl = process.env.ZERO_G_COMPUTE_BASE_URL ?? DEFAULT_COMPUTE_BASE_URL;
  const model = process.env.ZERO_G_COMPUTE_MODEL ?? DEFAULT_COMPUTE_MODEL;

  return {
    ...summary,
    compute: {
      provider: "0G Compute",
      model,
      baseUrl,
      teeRequested: true,
      mode: "fallback",
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "0G Compute was not available.",
    },
  };
}

function parseAgentJson(rawText: string): ParsedAgentOutput {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as ParsedAgentOutput;
  } catch {
    return {
      narrative: rawText,
    };
  }
}

function normalizeList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return normalized.length ? normalized : fallback;
}
