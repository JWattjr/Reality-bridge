import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProofRecord } from "@/lib/mock-data";

const DATA_DIR = path.join(process.cwd(), "data");
const PROOFS_FILE = path.join(DATA_DIR, "proof-records.json");

export async function readProofRecords(): Promise<ProofRecord[]> {
  try {
    const content = await readFile(PROOFS_FILE, "utf8");
    return JSON.parse(content) as ProofRecord[];
  } catch {
    return [];
  }
}

export async function appendProofRecord(record: ProofRecord) {
  const records = await readProofRecords();
  const deduped = records.filter((item) => item.id !== record.id);

  deduped.unshift(record);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PROOFS_FILE, JSON.stringify(deduped, null, 2), "utf8");

  return deduped;
}
