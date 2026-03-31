import { readFileSync, existsSync } from "fs";
import { join, isAbsolute } from "path";

function resolvePath(pathOrRelative: string): string {
  if (isAbsolute(pathOrRelative)) return pathOrRelative;
  return join(/* turbopackIgnore: true */ process.cwd(), pathOrRelative);
}

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

export function parseCsv(pathOrRelative: string): Record<string, string>[] {
  const fullPath = resolvePath(pathOrRelative);
  
  if (!existsSync(fullPath)) {
    console.error(`CSV not found: ${fullPath}`);
    return [];
  }

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
