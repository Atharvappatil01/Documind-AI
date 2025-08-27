import React from 'react';
import { Health } from './../types';

const HealthDot: React.FC<{ status: Health }> = ({ status }) => {
  const color = status === "up" ? "#16a34a" : status === "down" ? "#dc2626" : "#a3a3a3";
  const text = status === "up" ? "Healthy" : status === "down" ? "Down" : "Unknown";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }} title={`API: ${text}`}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 12, color: "#4b5563" }}>{text}</span>
    </div>
  );
};

export default HealthDot;