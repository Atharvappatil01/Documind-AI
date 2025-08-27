import React, { useState } from "react";
import Chip from "./components/Chip";
import HealthDot from "./components/HealthDot";
import IngestView from "./components/IngestView";
import AskViewSimple from "./components/AskViewSimple";
import { useHealth } from "./hooks/useHealth";
import { useIngest } from "./hooks/useIngest";
import { useAsk } from "./hooks/useAsk";
import { tabBtnStyle } from "./styles";

export default function App() {
  const [tab, setTab] = useState<"ingest" | "ask">("ingest");
  const [logs, setLogs] = useState<string[]>([]);
  const { health } = useHealth();
  const { docs, setDocs, isUploading, onFilesChosen } = useIngest(setLogs);
  const { question, setQuestion, topK, setTopK, answer, asking, onAsk } = useAsk();

  const pushLog = (s: string) => setLogs((prev) => [new Date().toLocaleTimeString() + " • " + s, ...prev].slice(0, 10));

  const disabledAsk = health !== "up" || asking;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#fafafa", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "white", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <strong style={{ fontSize: 20, color: "#1e293b" }}>DocuMind AI</strong>
            <Chip label="Beta" style={{ background: "#fef3c7", color: "#92400e", fontSize: "11px" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/docs" style={{ color: "#6366f1", textDecoration: "none", fontWeight: 500 }}>Documentation</a>
            <HealthDot status={health} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", minHeight: "calc(100vh - 140px)" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: "4px", borderRadius: "12px", marginBottom: "32px", width: "fit-content" }}>
          <button
            onClick={() => setTab("ingest")}
            style={{
              ...tabBtnStyle(tab === "ingest"),
              background: tab === "ingest" ? "white" : "transparent",
              color: tab === "ingest" ? "#1e293b" : "#64748b",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontWeight: 500,
              transition: "all 0.2s ease",
              boxShadow: tab === "ingest" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            Upload Documents
          </button>
          <button
            onClick={() => setTab("ask")}
            style={{
              ...tabBtnStyle(tab === "ask"),
              background: tab === "ask" ? "white" : "transparent",
              color: tab === "ask" ? "#1e293b" : "#64748b",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontWeight: 500,
              transition: "all 0.2s ease",
              boxShadow: tab === "ask" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            Ask Questions
          </button>
        </div>

        {tab === "ingest" ? (
          <IngestView
            docs={docs}
            setDocs={setDocs}
            isUploading={isUploading}
            onFilesChosen={onFilesChosen}
            logs={logs}
            pushLog={pushLog}
          />
        ) : (
          <AskViewSimple
            question={question}
            setQuestion={setQuestion}
            topK={topK}
            setTopK={setTopK}
            answer={answer}
            asking={asking}
            onAsk={onAsk}
            disabled={disabledAsk}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e5e7eb", background: "white", marginTop: "auto" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 24px", color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span>For research purposes only. Not legal advice.</span>
            <span>•</span>
            <span>Powered by Google Gemini AI</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>v1.0.0</span>
            <span>•</span>
            <span>DocuMind AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
