import React from 'react';

interface CTAButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  size?: 'small' | 'large';
}

// Marketing team asked for "their own button" with brand colors
const CTAButton: React.FC<CTAButtonProps> = ({
  children,
  onClick,
  disabled,
  variant = 'default',
  size = 'large',
}) => {
  const bgColor = variant === 'danger' ? '#dc2626' : '#7c3aed';
  const paddingY = size === 'large' ? 14 : 8;
  const paddingX = size === 'large' ? 32 : 16;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#e2e8f0' : bgColor,
        color: disabled ? '#94a3b8' : '#ffffff',
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius: 9999,
        border: 'none',
        fontWeight: 800,
        fontSize: size === 'large' ? 16 : 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        boxShadow: disabled ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.4)',
      }}
    >
      {children}
    </button>
  );
};

export default CTAButton;
