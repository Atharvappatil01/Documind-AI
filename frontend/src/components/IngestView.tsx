import React, { useRef, useState } from "react";
import SectionCard from "./SectionCard";
import { DocItem } from "../types";

interface IngestViewProps {
  docs: DocItem[];
  setDocs: React.Dispatch<React.SetStateAction<DocItem[]>>;
  isUploading: boolean;
  onFilesChosen: (files: FileList | null) => void;
  logs: string[];
  pushLog: (s: string) => void;
}

export default function IngestView({ docs, setDocs, isUploading, onFilesChosen, logs, pushLog }: IngestViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFilesChosen(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDeleteDoc = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    
    setDeleting(docId);
    try {
      const response = await fetch(`http://localhost:8000/documents/${doc.name}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the document from the local state
        setDocs(prev => prev.filter(d => d.id !== docId));
        pushLog(`Deleted document: ${doc.name}`);
      } else {
        pushLog(`Failed to delete document: ${doc.name}`);
      }
    } catch (error) {
      pushLog(`Error deleting document: ${doc.name}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* Upload Section */}
      <div style={{ 
        background: 'white', 
        borderRadius: 16, 
        padding: 32, 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            color: '#1e293b', 
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Upload Legal Documents
          </h2>
          <p style={{ 
            fontSize: 16, 
            color: '#64748b', 
            margin: 0,
            lineHeight: 1.5
          }}>
            Upload your legal documents to enable AI-powered analysis and insights
          </p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload PDFs"
          style={{
            border: '2px dashed #6366f1',
            background: '#f8fafc',
            borderRadius: 20,
            padding: 60,
            textAlign: 'center',
            cursor: 'pointer',
            outline: 'none',
            marginBottom: 24,
            transition: 'all 0.2s ease',
            minHeight: '160px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4f46e5';
            e.currentTarget.style.background = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.background = '#f8fafc';
          }}
        >
                      <div style={{ fontSize: '64px', marginBottom: '24px' }}></div>
          <div style={{ fontSize: 20, color: '#1e293b', fontWeight: 600, marginBottom: '12px' }}>
            Drop your legal documents here
          </div>
          <div style={{ fontSize: 16, color: '#64748b', marginBottom: '8px' }}>
            or <span style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'underline' }}>browse files</span>
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: '12px' }}>
            Supports PDF files • Max 10MB per file • Drag & drop supported
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => onFilesChosen(e.target.files)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          Tip: Upload contracts, leases, agreements, and legal documents
          </div>
          <button 
            disabled={isUploading} 
            style={{ 
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#64748b',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }} 
            onClick={() => pushLog('Manual ingest not implemented – drop or browse files.')}
          >
            Help
          </button>
        </div>
      </div>

      {/* Uploaded Documents */}
      <div style={{ 
        background: 'white', 
        borderRadius: 16, 
        padding: 32, 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            color: '#1e293b', 
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            📁 Uploaded Documents
          </h2>
          <p style={{ 
            fontSize: 16, 
            color: '#64748b', 
            margin: 0,
            lineHeight: 1.5
          }}>
            Manage and view your uploaded legal documents
          </p>
        </div>

        {docs.length === 0 ? (
          <div style={{ 
            color: '#64748b', 
            fontSize: 16, 
            padding: 60,
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 16,
            border: '2px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}></div>
            <div style={{ fontWeight: 600, marginBottom: '12px', color: '#475569', fontSize: '18px' }}>
              No documents uploaded yet
            </div>
            <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
              Upload legal documents to start analyzing with AI
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {docs.map((doc) => (
              <div key={doc.id} style={{ 
                padding: 24, 
                backgroundColor: '#ffffff', 
                borderRadius: 12, 
                border: '1px solid #e2e8f0',
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: 600, 
                    color: '#1e293b', 
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {doc.name}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: '#64748b',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <span>{(doc.size / 1024).toFixed(1)} KB</span>
                    <span>{doc.status}</span>
                    {doc.error && <span style={{ color: '#dc2626' }}>{doc.error}</span>}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteDoc(doc.id)} 
                  disabled={deleting === doc.id} 
                  style={{ 
                    marginLeft: 16, 
                    background: 'none', 
                    border: 'none', 
                    color: '#dc2626', 
                    fontWeight: 700, 
                    fontSize: 20, 
                    cursor: 'pointer', 
                    lineHeight: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {deleting === doc.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs */}
      <div style={{ 
        background: 'white', 
        borderRadius: 16, 
        padding: 32, 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            color: '#1e293b', 
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Activity Log
          </h2>
          <p style={{ 
            fontSize: 16, 
            color: '#64748b', 
            margin: 0,
            lineHeight: 1.5
          }}>
            View recent upload and processing activities
          </p>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0',
          borderRadius: 12, 
          padding: 20,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {logs.length === 0 ? (
            <div style={{ 
              color: '#64748b', 
              fontSize: 14, 
              textAlign: 'center',
              padding: 20
            }}>
              No activity yet. Upload documents to see logs.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{ 
                  fontSize: 13, 
                  color: '#475569',
                  padding: '8px 12px',
                  background: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontFamily: 'monospace'
                }}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}