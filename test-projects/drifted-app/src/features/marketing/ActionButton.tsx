import React from 'react';

interface ActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: string;
}

// "Quick win" added by a contractor for the marketing page
const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  disabled,
  color = '#0ea5e9',
  size = 'medium',
}) => {
  const height = size === 'small' ? 32 : size === 'large' ? 52 : 40;
  const px = size === 'small' ? 12 : size === 'large' ? 28 : 20;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height,
        paddingLeft: px,
        paddingRight: px,
        backgroundColor: color,
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.2s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
};

export default ActionButton;
