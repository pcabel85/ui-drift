import React from 'react';
import { Button as MuiButton } from '@mui/material';

// Thin wrapper that adds company-standard defaults
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'contained', color = 'primary', ...rest }) => {
  return (
    <MuiButton variant={variant} color={color} {...rest}>
      {children}
    </MuiButton>
  );
};

export default Button;
