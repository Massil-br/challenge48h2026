import { readFileSync } from "fs";
import { join } from "path";

/**
 * Parse un fichier CSV situé relativement à la racine du projet.
 * Adapté aux CSV sans champs entre guillemets (données open data nettoyées).
 */
export function parseCsv(relativePath: string): Record<string, string>[] {
  const fullPath = join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  const content = readFileSync(fullPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() ?? "";
    });
    return row;
  });
}

export function toFloat(val: string | undefined): number {
  if (!val || val === "") return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function toInt(val: string | undefined): number {
  if (!val || val === "") return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : Math.round(toFloat(val));
}
