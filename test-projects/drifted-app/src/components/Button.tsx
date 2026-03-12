import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

// Hand-rolled button — no design system
const Button: React.FC<ButtonProps> = ({ children, onClick, disabled, variant = 'primary', size = 'md' }) => {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 17 : 15,
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '9px 18px',
    background: variant === 'primary' ? '#2563eb' : '#f1f5f9',
    color: variant === 'primary' ? '#ffffff' : '#1e293b',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <button style={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;
