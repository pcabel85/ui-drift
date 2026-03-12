import React from 'react';
import { Card as MuiCard, CardContent, Typography } from '@mui/material';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  variant?: 'outlined' | 'elevation';
}

const Card: React.FC<CardProps> = ({ children, title, variant = 'outlined' }) => {
  return (
    <MuiCard variant={variant}>
      <CardContent>
        {title && (
          <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
            {title}
          </Typography>
        )}
        {children}
      </CardContent>
    </MuiCard>
  );
};

export default Card;
