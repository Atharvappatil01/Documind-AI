import { useState } from 'react';
import { DocItem } from '../types';

const API_BASE = "http://localhost:8000"; // FastAPI backend URL

export const useIngest = (
  setLogs: React.Dispatch<React.SetStateAction<string[]>>
) => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pushLog = (s: string) => setLogs((prev) => [new Date().toLocaleTimeString() + " • " + s, ...prev].slice(0, 10));

  const onFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: DocItem[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      status: "Queued",
    }));
    setDocs((prev) => [...items, ...prev]);
    await uploadFiles(Array.from(files), items.map((i) => i.id));
  };

  const uploadFiles = async (files: File[], ids: string[]) => {
    setIsUploading(true);
    setDocs((prev) => prev.map((d) => (ids.includes(d.id) ? { ...d, status: "Parsing" } : d)));

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    try {
      const res = await fetch(`${API_BASE}/ingest`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Ingest failed");
      }

      setDocs((prev) => prev.map((d) => (ids.includes(d.id) ? { ...d, status: "Chunked" } : d)));
      setTimeout(() => {
        setDocs((prev) => prev.map((d) => (ids.includes(d.id) ? { ...d, status: "Embedded" } : d)));
      }, 400);

      pushLog(`Ingested ${files.length} file(s).`);
    } catch (e: any) {
      setDocs((prev) => prev.map((d) => (ids.includes(d.id) ? { ...d, status: "Error", error: String(e?.message || e) } : d)));
      pushLog(`Ingest error: ${String((e && e.message) || e)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return { docs, setDocs, isUploading, onFilesChosen };
};