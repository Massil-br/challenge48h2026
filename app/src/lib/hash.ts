import { createHash } from "crypto";

/**
 * Génère un hash SHA-256 déterministe à partir d'un objet JSON.
 * Les clés sont triées pour garantir la cohérence indépendamment de l'ordre d'insertion.
 */
export function generateHash(data: unknown): string {
  const sorted = JSON.stringify(data, Object.keys(data as Record<string, unknown>).sort());
  return createHash("sha256").update(sorted).digest("hex");
}
