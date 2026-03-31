import { readFileSync } from "fs";
import { join } from "path";

/**
 * Parse une ligne CSV en respectant les champs entre guillemets.
 */
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse un fichier CSV situé relativement à la racine du projet.
 * Gère les champs entre guillemets contenant des virgules.
 */
export function parseCsv(relativePath: string): Record<string, string>[] {
  const fullPath = join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  const content = readFileSync(fullPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
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
