'use client';

import { useEffect } from 'react';
import { Card, CardContent, Typography, Box, Button, Chip } from '@mui/material';
import { Notifications, ArrowForward } from '@mui/icons-material';
import { useNotificationStore } from '@/store/notificationStore';
import { useRouter } from 'next/navigation';

export default function NotificationSummary() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const recentNotifications = notifications.filter(n => !n.isRead).slice(0, 3);

  if (unreadCount === 0) return null;

  return (
    <Card sx={{ mb: 3, borderLeft: '4px solid #1976d2' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Notifications color="primary" />
            <Typography variant="h6">
              You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ArrowForward />}
            onClick={() => router.push('/notifications')}
          >
            View All
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {recentNotifications.map((notification) => (
            <Box 
              key={notification.id}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 1,
                backgroundColor: 'action.hover',
                borderRadius: 1,
                cursor: 'pointer'
              }}
              onClick={() => router.push('/notifications')}
            >
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {notification.title}
              </Typography>
              <Chip 
                label={notification.priority} 
                size="small" 
                color={notification.priority === 'HIGH' ? 'warning' : 'info'}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}