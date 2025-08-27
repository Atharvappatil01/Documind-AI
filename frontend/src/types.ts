export type Health = "up" | "down" | "unknown";

export type DocStatus = "Queued" | "Parsing" | "Chunked" | "Embedded" | "Error";

export interface DocItem {
  id: string;
  name: string;
  size: number;
  status: DocStatus;
  error?: string;
}

export interface Citation {
  source: string;  // Changed from filename to source to match simplified backend
  page?: number;
  chunk_id?: string;
}

export interface AskResponse {
  answer: string;
  citations?: Citation[];
  confidence?: "high" | "medium" | "low";
  context_tokens?: number;
  source_documents?: string[];
}

export interface QAItem {
  q: string;
  a: string;
  time: number;
  source_documents?: string[];
}