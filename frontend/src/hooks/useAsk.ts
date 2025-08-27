import { useState, useEffect } from 'react';
import { AskResponse, QAItem } from '../types';

const API_BASE = "http://localhost:8000"; // FastAPI backend URL

export const useAsk = () => {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [asking, setAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAItem[]>(() => {
    const raw = localStorage.getItem("harvey.qaHistory");
    return raw ? (JSON.parse(raw) as QAItem[]) : [];
  });

  useEffect(() => {
    localStorage.setItem("harvey.qaHistory", JSON.stringify(qaHistory.slice(-10)));
  }, [qaHistory]);

  const onAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), top_k: topK, selected_documents: selectedDocuments }),
      });
      const data = (await res.json()) as AskResponse;
      if (!res.ok) throw new Error((data as any)?.detail || "Ask failed");
      setAnswer(data);
      setQaHistory((prev) => [{ q: question.trim(), a: data.answer, time: Date.now() }, ...prev].slice(0, 10));
    } catch (e: any) {
      setAnswer({ answer: `Error: ${String(e?.message || e)}` });
    } finally {
      setAsking(false);
    }
  };

  return { question, setQuestion, topK, setTopK, selectedDocuments, setSelectedDocuments, answer, asking, onAsk, qaHistory };
};