// CSV/TSV Export & Import utilities

export type FileFormat = "csv" | "tsv";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeTSV(value: string): string {
  return value.replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, "");
}

function formatRow(values: string[], format: FileFormat): string {
  if (format === "tsv") return values.map(escapeTSV).join("\t");
  return values.map(escapeCSV).join(",");
}

export function generateFile(headers: string[], rows: string[][], format: FileFormat): string {
  const lines = [formatRow(headers, format), ...rows.map((r) => formatRow(r, format))];
  return lines.join("\n");
}

export function downloadFile(content: string, filename: string, format: FileFormat) {
  const BOM = "\uFEFF";
  const mime = format === "tsv" ? "text/tab-separated-values;charset=utf-8;" : "text/csv;charset=utf-8;";
  const blob = new Blob([BOM + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Detect separator: if first line has more tabs than commas → TSV */
export function detectSeparator(text: string): "," | "\t" {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

export function parseDelimited(text: string): { headers: string[]; rows: string[][] } {
  const sep = detectSeparator(text);
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parse = (line: string): string[] => {
    if (sep === "\t") {
      return line.split("\t").map((s) => s.trim());
    }
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parse(lines[0]);
  const rows = lines.slice(1).map(parse);
  return { headers, rows };
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function detectCategory(headers: string[]): "publication" | "appointment" | null {
  const h = headers.map((x) => x.toLowerCase().trim());
  if (h.includes("conteudo") || h.includes("link_canva") || h.includes("tipo_conteudo") || h.includes("data_postagem")) return "publication";
  if (h.includes("starttime") || h.includes("recurrence") || (h.includes("type") && h.includes("notes"))) return "appointment";
  if (h.includes("title") && h.includes("date") && h.includes("type")) return "appointment";
  return null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  publication: "Mídia",
  appointment: "Compromissos",
};
