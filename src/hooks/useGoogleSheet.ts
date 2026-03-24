import { useState, useEffect, useCallback } from "react";
import type { ContentItem, ContentStatus, ContentType, ContentCategory } from "@/data/mockData";
import { mockData } from "@/data/mockData";

const STORAGE_KEY = "google-sheet-id";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseStatus(raw: string): ContentStatus {
  const s = raw.toLowerCase().trim();
  if (s.includes("publicada")) return "Publicada";
  if (s.includes("andamento") || s.includes("começ") || s.includes("come")) {
    if (s.includes("não") || s.includes("nao")) return "Não Começado";
    return "Em Andamento";
  }
  if (s.includes("não") || s.includes("nao")) return "Não Começado";
  return "Em Andamento";
}

function parseType(raw: string): string {
  if (raw.toLowerCase().includes("blog")) return "Blog";
  return "Instagram";
}

function parseCategory(raw: string): ContentCategory {
  const s = raw.toLowerCase().trim();
  if (s.includes("autoridade")) return "Autoridade";
  if (s.includes("portf")) return "Portfólio";
  return "Institucional";
}

function parseDate(raw: string): string {
  // Try DD/MM/YYYY
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw;
}

function csvToContentItems(csv: string): ContentItem[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Skip header row (line 0)
  const items: ContentItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 6) continue;

    const num = parseInt(cols[0]) || i;
    items.push({
      id: i,
      number: num,
      title: cols[1] || "",
      type: parseType(cols[2] || "") as ContentType,
      responsible: cols[3] || "",
      details: cols[4] || "",
      status: parseStatus(cols[5] || ""),
      date: parseDate(cols[6] || ""),
      canvaLink: cols[7] || "",
      interactions: parseFloat(cols[8]?.replace(/\./g, "").replace(",", ".")) || 0,
      likes: parseInt(cols[9]?.replace(/\./g, "")) || 0,
      engagement: parseFloat(cols[10]?.replace(/\./g, "").replace(",", ".")) || 0,
      timeToMake: parseInt(cols[11]) || 0,
      category: parseCategory(cols[12] || ""),
    });
  }
  return items;
}

export function useGoogleSheet() {
  const [sheetId, setSheetId] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || "");
  const [data, setData] = useState<ContentItem[]>(mockData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchSheet = useCallback(async (id: string) => {
    if (!id.trim()) {
      setData(mockData);
      setIsConnected(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // gid=0 for first sheet. User can change if needed.
      const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=0`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Não foi possível acessar a planilha. Verifique se ela está publicada na web.");
      }

      const csv = await res.text();
      const items = csvToContentItems(csv);

      if (items.length === 0) {
        throw new Error("Nenhum dado encontrado na planilha. Verifique a estrutura.");
      }

      setData(items);
      setIsConnected(true);
    } catch (err: any) {
      setError(err.message);
      setData(mockData);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSheetId = useCallback(
    (id: string) => {
      setSheetId(id);
      if (id.trim()) {
        localStorage.setItem(STORAGE_KEY, id);
        fetchSheet(id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setData(mockData);
        setIsConnected(false);
        setError(null);
      }
    },
    [fetchSheet]
  );

  const refresh = useCallback(() => {
    if (sheetId.trim()) fetchSheet(sheetId);
  }, [sheetId, fetchSheet]);

  // Auto-fetch on mount
  useEffect(() => {
    if (sheetId.trim()) fetchSheet(sheetId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, sheetId, isConnected, saveSheetId, refresh };
}
