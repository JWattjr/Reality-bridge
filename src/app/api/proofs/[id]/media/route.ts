import { readProofRecords } from "@/lib/proof-store";
import { downloadBlobFromZeroG } from "@/lib/zero-g";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proofs = await readProofRecords();
  const proof = proofs.find((item) => item.id === id);

  if (!proof) {
    return Response.json({ status: "not_found", issues: ["Proof record not found"] }, { status: 404 });
  }

  if (!proof.mediaStorage) {
    return Response.json({ status: "not_found", issues: ["Proof has no uploaded media"] }, { status: 404 });
  }

  try {
    const blob = await downloadBlobFromZeroG(proof.mediaStorage.rootHash);
    const fileName = getMediaFileName(proof);
    const contentType = getMediaContentType(proof, blob);

    return new Response(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "public, max-age=300",
        "X-0G-Root-Hash": proof.mediaStorage.rootHash,
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: "download_failed",
        issues: [error instanceof Error ? error.message : "Failed to download media from 0G Storage"],
      },
      { status: 502 },
    );
  }
}

function getMediaFileName(proof: Awaited<ReturnType<typeof readProofRecords>>[number]) {
  const storedFileName = getOptionalString(proof.mediaStorage, "fileName");
  if (storedFileName) return sanitizeFileName(storedFileName);

  const labelFileName = proof.evidenceLabel.split(":").pop()?.trim();
  if (labelFileName?.includes(".")) return sanitizeFileName(labelFileName);

  return `${proof.id}.${extensionForContentType(getMediaContentType(proof))}`;
}

function getMediaContentType(
  proof: Awaited<ReturnType<typeof readProofRecords>>[number],
  blob?: Blob,
) {
  const storedContentType = getOptionalString(proof.mediaStorage, "contentType");
  if (storedContentType) return storedContentType;
  if (blob?.type) return blob.type;

  const fileName = proof.evidenceLabel.split(":").pop()?.trim().toLowerCase() ?? "";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".webp")) return "image/webp";
  if (fileName.endsWith(".gif")) return "image/gif";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";

  return "application/octet-stream";
}

function getOptionalString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || !(key in value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionForContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/jpeg") return "jpg";
  return "bin";
}
