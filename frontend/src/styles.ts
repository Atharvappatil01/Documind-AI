import React from 'react';

export function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    background: active ? "#eef2ff" : "white",
    color: active ? "#3730a3" : "#111827",
    padding: "8px 14px",
    borderRadius: 10,
    cursor: "pointer",
  };
}

export function primaryBtnStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    background: disabled ? "#c7d2fe" : "#4f46e5",
    color: "white",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}

export const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
};

export const linkBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#4f46e5",
  cursor: "pointer",
  padding: 0,
};

export function capitalize<T extends string>(s: T): T {
  return ((s.charAt(0).toUpperCase() + s.slice(1)) as unknown) as T;
}