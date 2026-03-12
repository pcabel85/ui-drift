import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  padding?: number;
  shadow?: boolean;
  border?: boolean;
}

// Custom card — built before someone added a shared one
const Card: React.FC<CardProps> = ({
  children,
  title,
  padding = 16,
  shadow = true,
  border = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding,
        boxShadow: shadow ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' : 'none',
        border: border ? '1px solid #e2e8f0' : 'none',
      }}
    >
      {title && (
        <h3
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 16,
            fontWeight: 600,
            color: '#0f172a',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: 12,
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Card;
