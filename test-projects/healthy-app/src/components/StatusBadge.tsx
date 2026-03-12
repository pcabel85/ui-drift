import React from 'react';
import { Chip } from '@mui/material';
import { CheckCircle, Warning, Error, Info } from '@mui/icons-material';

type Status = 'success' | 'warning' | 'error' | 'info' | 'pending';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  size?: 'small' | 'medium';
}

const statusConfig: Record<Status, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: React.ReactElement }> = {
  success: { color: 'success', icon: <CheckCircle /> },
  warning: { color: 'warning', icon: <Warning /> },
  error: { color: 'error', icon: <Error /> },
  info: { color: 'info', icon: <Info /> },
  pending: { color: 'default', icon: <Info /> },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'small' }) => {
  const { color, icon } = statusConfig[status];
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Chip
      icon={icon}
      label={displayLabel}
      color={color}
      size={size}
      variant="filled"
    />
  );
};

export default StatusBadge;
