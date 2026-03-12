import React from 'react';
import { Avatar, Tooltip, Badge, Typography, Box } from '@mui/material';

interface UserAvatarProps {
  name: string;
  src?: string;
  size?: 'small' | 'medium' | 'large';
  online?: boolean;
  showName?: boolean;
}

const sizeMap = { small: 32, medium: 40, large: 56 };

const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  src,
  size = 'medium',
  online = false,
  showName = false,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatar = (
    <Avatar
      src={src}
      alt={name}
      sx={{ width: sizeMap[size], height: sizeMap[size] }}
    >
      {!src && initials}
    </Avatar>
  );

  const badgedAvatar = online ? (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      variant="dot"
      color="success"
    >
      {avatar}
    </Badge>
  ) : avatar;

  if (showName) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        {badgedAvatar}
        <Typography variant="body2" fontWeight={500}>
          {name}
        </Typography>
      </Box>
    );
  }

  return (
    <Tooltip title={name} arrow>
      {badgedAvatar}
    </Tooltip>
  );
};

export default UserAvatar;
