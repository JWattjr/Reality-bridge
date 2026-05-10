import type { ProofRecord } from "@/lib/mock-data";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";

type ProofRecordRow = {
  id: string;
  event_id: string;
  user_id: string;
  mission_id: string;
  proof_type: ProofRecord["proofType"];
  proof_timestamp: string;
  location: string;
  xp_earned: number;
  validator: ProofRecord["validator"];
  status: ProofRecord["status"];
  evidence_label: string;
  storage: ProofRecord["storage"];
  media_storage: ProofRecord["mediaStorage"] | null;
  chain_anchor: ProofRecord["chainAnchor"] | null;
  badge_id: string | null;
  created_at?: string;
};

const memoryProofRecords: ProofRecord[] = [];

export async function readProofRecords(): Promise<ProofRecord[]> {
  if (!hasSupabaseConfig()) {
    return memoryProofRecords;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("proof_records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to read Supabase proof records: ${error.message}`);
  }

  return (data ?? []).map(recordFromRow);
}

export async function appendProofRecord(record: ProofRecord) {
  if (!hasSupabaseConfig()) {
    const deduped = memoryProofRecords.filter((item) => item.id !== record.id);
    memoryProofRecords.splice(0, memoryProofRecords.length, record, ...deduped);
    return memoryProofRecords;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("proof_records")
    .upsert(recordToRow(record), { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to write Supabase proof record: ${error.message}`);
  }

  return readProofRecords();
}

function recordToRow(record: ProofRecord): ProofRecordRow {
  return {
    id: record.id,
    event_id: record.eventId,
    user_id: record.userId,
    mission_id: record.missionId,
    proof_type: record.proofType,
    proof_timestamp: record.timestamp,
    location: record.location,
    xp_earned: record.xpEarned,
    validator: record.validator,
    status: record.status,
    evidence_label: record.evidenceLabel,
    storage: record.storage,
    media_storage: record.mediaStorage ?? null,
    chain_anchor: record.chainAnchor ?? null,
    badge_id: record.badgeId ?? null,
  };
}

function recordFromRow(row: ProofRecordRow): ProofRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    missionId: row.mission_id,
    proofType: row.proof_type,
    timestamp: row.proof_timestamp,
    location: row.location,
    xpEarned: row.xp_earned,
    validator: row.validator,
    status: row.status,
    evidenceLabel: row.evidence_label,
    storage: row.storage,
    mediaStorage: row.media_storage ?? undefined,
    chainAnchor: row.chain_anchor ?? undefined,
    badgeId: row.badge_id ?? undefined,
  };
}
