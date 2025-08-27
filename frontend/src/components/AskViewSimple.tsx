import React, { useState } from "react";
import SectionCard from "./SectionCard";
import Chip from "./Chip";
import { useDocuments } from "../hooks/useDocuments";
import { AskResponse } from "../types";

interface AskViewSimpleProps {
  question: string;
  setQuestion: (q: string) => void;
  topK: number;
  setTopK: (k: number) => void;
  answer: AskResponse | null;
  asking: boolean;
  onAsk: () => void;
  disabled: boolean;
}

export default function AskViewSimple({ 
  question, 
  setQuestion, 
  topK, 
  setTopK, 
  answer, 
  asking, 
  onAsk, 
  disabled 
}: AskViewSimpleProps) {
  const { documents, loading: documentsLoading, refetch } = useDocuments();
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDocCheckbox = (filename: string) => {
    setSelectedDocuments(prev => 
      prev.includes(filename) 
        ? prev.filter(d => d !== filename)
        : [...prev, filename]
    );
  };

  const handleDeleteDoc = async (filename: string) => {
    setDeleting(filename);
    try {
      const response = await fetch(`http://localhost:8000/documents/${filename}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the document from selected documents if it was selected
        setSelectedDocuments(prev => prev.filter(doc => doc !== filename));
        // Refresh the documents list
        refetch();
      } else {
        console.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeleting(null);
    }
  };

  const renderSimpleAnswer = (text: string) => {
    // Simple markdown-like rendering
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: '16px 0 8px 0' }}>{line.substring(3)}</h3>;
        }
        if (line.startsWith('* ')) {
          return <li key={i} style={{ margin: '4px 0' }}>{line.substring(2)}</li>;
        }
        if (line.startsWith('> ')) {
          return <blockquote key={i} style={{ 
            borderLeft: '4px solid #6366f1', 
            paddingLeft: 16, 
            margin: '12px 0', 
            fontStyle: 'italic',
            color: '#475569'
          }}>{line.substring(2)}</blockquote>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i} style={{ margin: '8px 0', lineHeight: 1.6 }}>{line}</p>;
      });
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* Input Section */}
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
            DocuMind AI
          </h2>
          <p style={{ 
            fontSize: 16, 
            color: '#64748b', 
            margin: 0,
            lineHeight: 1.5
          }}>
            Upload legal documents and ask questions to get instant AI-powered insights
          </p>
        </div>

        {/* Document Selection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            fontWeight: 600, 
            marginBottom: 16, 
            color: '#1e293b',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Select documents to analyze:
          </div>
          {documentsLoading ? (
            <div style={{ 
              color: '#64748b', 
              fontSize: 14, 
              padding: 16, 
              background: '#f8fafc', 
              borderRadius: 12,
              border: '1px solid #e2e8f0'
            }}>
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div style={{ 
              color: '#64748b', 
              fontSize: 16, 
              padding: 32, 
              background: '#f8fafc', 
              borderRadius: 12,
              textAlign: 'center',
              border: '2px dashed #cbd5e1'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
              <div style={{ fontWeight: 500, marginBottom: '8px', color: '#475569' }}>No documents uploaded</div>
              <div style={{ fontSize: '14px' }}>Upload legal documents to start analyzing</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {documents.map((doc) => (
                <label key={doc.filename} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  fontSize: 14, 
                  background: selectedDocuments.includes(doc.filename) ? '#6366f1' : '#f8fafc', 
                  color: selectedDocuments.includes(doc.filename) ? 'white' : '#334155',
                  borderRadius: 10, 
                  padding: '10px 16px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: selectedDocuments.includes(doc.filename) ? 'none' : '1px solid #e2e8f0',
                  fontWeight: 500
                }}>
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.filename)}
                    onChange={() => handleDocCheckbox(doc.filename)}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.filename}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Question Input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ 
            display: 'block', 
            fontWeight: 600, 
            color: '#1e293b', 
            marginBottom: 12,
            fontSize: 16
          }}>
            Ask your question:
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask any question about your legal documents... (e.g., 'Summarize the lease in 200 words', 'What are the key terms?', 'Explain the payment schedule')"
            rows={4}
            style={{ 
              width: '100%', 
              padding: 16, 
              borderRadius: 12, 
              border: '2px solid #e2e8f0', 
              resize: 'vertical', 
              boxSizing: 'border-box', 
              fontSize: 16,
              fontFamily: 'Inter, system-ui, sans-serif',
              transition: 'border-color 0.2s ease',
              outline: 'none',
              lineHeight: 1.5
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
              Top-K:
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              style={{ 
                width: 80, 
                padding: 8, 
                borderRadius: 8, 
                border: '1px solid #e2e8f0',
                fontSize: 14,
                textAlign: 'center'
              }}
            />
            <span style={{ fontSize: 14, color: '#64748b' }}>documents</span>
          </div>
          <button
            onClick={onAsk}
            disabled={disabled || selectedDocuments.length === 0}
            style={{
              background: disabled || selectedDocuments.length === 0 ? '#e2e8f0' : '#6366f1',
              color: disabled || selectedDocuments.length === 0 ? '#94a3b8' : 'white',
              border: 'none',
              borderRadius: 12,
              padding: '14px 28px',
              fontSize: 16,
              fontWeight: 600,
              cursor: disabled || selectedDocuments.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            aria-busy={asking}
          >
            {asking ? 'Analyzing...' : 'Ask AI'}
          </button>
        </div>
      </div>

      {/* Results Section */}
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
            AI Analysis Results
          </h2>
          <p style={{ 
            fontSize: 16, 
            color: '#64748b', 
            margin: 0,
            lineHeight: 1.5
          }}>
            Get instant insights and analysis from your legal documents
          </p>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          {!answer ? (
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
                Ready to analyze your legal documents
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                Upload documents and ask questions to get started with AI-powered analysis
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {answer.confidence && (
                  <Chip 
                    label={`Confidence: ${capitalize(answer.confidence)}`} 
                    style={{
                      background: answer.confidence === 'high' ? '#dcfce7' : 
                                 answer.confidence === 'medium' ? '#fef3c7' : '#fee2e2',
                      color: answer.confidence === 'high' ? '#166534' : 
                             answer.confidence === 'medium' ? '#92400e' : '#991b1b',
                      fontWeight: 600
                    }}
                  />
                )}
                {answer.context_tokens && (
                  <Chip 
                    label={`${answer.context_tokens} tokens analyzed`}
                    style={{ background: '#f1f5f9', color: '#475569', fontWeight: 500 }}
                  />
                )}
              </div>
              <div style={{
                background: '#fafafa',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: 24,
                fontSize: 16,
                lineHeight: 1.7,
                color: '#1e293b',
                maxHeight: '60vh',
                overflowY: 'auto'
              }}>
                {renderSimpleAnswer(answer.answer)}
              </div>
              {answer.citations && answer.citations.length > 0 && (
                <div style={{ 
                  padding: 16, 
                  background: '#f8fafc', 
                  borderRadius: 12, 
                  fontSize: 14, 
                  color: '#64748b',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Sources:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {answer.citations.map((c, i) => (
                      <span key={i} style={{ 
                        padding: '6px 12px',
                        background: '#ffffff',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {c.source}{c.page ? ` p.${c.page}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document Library */}
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
            📁 Document Library
          </h2>
          <p style={{ 
            fontSize: 16, 
            color: '#64748b', 
            margin: 0,
            lineHeight: 1.5
          }}>
            Manage your uploaded legal documents
          </p>
        </div>

        {documentsLoading ? (
          <div style={{ 
            color: '#64748b', 
            fontSize: 14, 
            padding: 16, 
            background: '#f8fafc', 
            borderRadius: 12,
            border: '1px solid #e2e8f0'
          }}>
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ 
            color: '#64748b', 
            fontSize: 16, 
            padding: 40,
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 12,
            border: '2px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
            <div style={{ fontWeight: 500, marginBottom: '8px', color: '#475569' }}>No documents uploaded</div>
            <div style={{ fontSize: '14px' }}>Upload legal documents to start analyzing</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {documents.map((doc) => (
              <div key={doc.filename} style={{ 
                padding: 20, 
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
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {doc.filename}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: '#64748b',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <span>{doc.chunks} chunks</span>
                    <span>{new Date(doc.upload_time).toLocaleDateString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteDoc(doc.filename)} 
                  disabled={deleting === doc.filename} 
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
                  {deleting === doc.filename ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
