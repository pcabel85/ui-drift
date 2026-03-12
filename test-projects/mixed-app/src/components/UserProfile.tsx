import React from 'react';
import { Avatar, Typography, Box, Chip, Divider } from '@mui/material';
import { Verified } from '@mui/icons-material';

interface UserProfileProps {
  name: string;
  email: string;
  role: string;
  avatarSrc?: string;
  verified?: boolean;
  joinedDate: string;
  stats?: { label: string; value: string | number }[];
}

const UserProfile: React.FC<UserProfileProps> = ({
  name, email, role, avatarSrc, verified, joinedDate, stats = []
}) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Avatar src={avatarSrc} sx={{ width: 64, height: 64, fontSize: 22 }}>
          {!avatarSrc && initials}
        </Avatar>
        <Box>
          <Box display="flex" alignItems="center" gap={0.75}>
            <Typography variant="h6" fontWeight={700}>{name}</Typography>
            {verified && <Verified color="primary" fontSize="small" />}
          </Box>
          <Typography variant="body2" color="text.secondary">{email}</Typography>
          <Chip label={role} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary">
        Member since {joinedDate}
      </Typography>

      {stats.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" gap={3}>
            {stats.map(stat => (
              <Box key={stat.label} textAlign="center">
                <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default UserProfile;
