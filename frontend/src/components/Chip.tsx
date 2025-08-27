import React from 'react';

const Chip: React.FC<{ label: string } & React.HTMLAttributes<HTMLSpanElement>> = ({ label, ...rest }) => (
  <span
    {...rest}
    style={{
      display: "inline-block",
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 999,
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      color: "#3730a3",
    }}
  >
    {label}
  </span>
);

export default Chip;