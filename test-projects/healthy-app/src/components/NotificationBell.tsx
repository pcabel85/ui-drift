import React, { useState } from 'react';
import {
  IconButton, Badge, Popover, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Typography,
  Box, Button, Divider
} from '@mui/material';
import { Notifications, Circle } from '@mui/icons-material';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  type: 'info' | 'warning' | 'success';
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

const typeColorMap = { info: '#3b82f6', warning: '#f59e0b', success: '#22c55e' };

const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkAllRead,
  onMarkRead,
}) => {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Notifications">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480 } }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
            {unreadCount > 0 && (
              <Typography component="span" variant="caption" color="primary" ml={1}>
                {unreadCount} new
              </Typography>
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={onMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        <List disablePadding sx={{ maxHeight: 380, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary={<Typography color="text.secondary" variant="body2">No notifications</Typography>}
              />
            </ListItem>
          ) : notifications.map((n) => (
            <ListItem
              key={n.id}
              alignItems="flex-start"
              onClick={() => onMarkRead(n.id)}
              sx={{ cursor: 'pointer', bgcolor: n.read ? 'transparent' : 'action.hover' }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: typeColorMap[n.type], width: 32, height: 32 }}>
                  <Circle sx={{ fontSize: 12 }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={<Typography variant="body2" fontWeight={n.read ? 400 : 600}>{n.title}</Typography>}
                secondary={
                  <>
                    <Typography variant="caption" display="block">{n.message}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {n.timestamp.toLocaleTimeString()}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Popover>
    </>
  );
};

export default NotificationBell;
