import React from 'react';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: string;
  size?: string;
}

// Someone built this because they didn't know Button existed
const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  disabled,
  loading,
  fullWidth,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        backgroundColor: loading ? '#93c5fd' : '#1d4ed8',
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: 8,
        border: 'none',
        fontWeight: 700,
        fontSize: 14,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : 'auto',
        minWidth: 120,
        letterSpacing: '0.02em',
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

export default PrimaryButton;
