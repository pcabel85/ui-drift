import React from 'react';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: string;
  size?: string;
}

// Added during a "quick sprint" — team didn't realise Button.tsx existed
const PrimaryButton: React.FC<PrimaryButtonProps> = ({ children, onClick, disabled, loading }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        backgroundColor: disabled ? '#cbd5e1' : '#2563eb',
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: 8,
        border: 'none',
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

export default PrimaryButton;
