'use client';

import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Button, 
  Alert
} from '@mui/material';
import { 
  CheckCircle, 
  Assignment, 
  Gavel, 
  Schedule,
  MarkEmailRead
} from '@mui/icons-material';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.isRead
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNMENT': return <Assignment color="primary" />;
      case 'CASE_ASSIGNMENT': return <Gavel color="secondary" />;
      case 'TASK_DUE_SOON': return <Schedule color="warning" />;
      default: return <CheckCircle color="info" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.caseId) {
      router.push(`/cases/${notification.caseId}`);
    } else if (notification.taskId) {
      router.push(`/tasks`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Notifications</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={filter === 'all' ? 'contained' : 'outlined'}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'contained' : 'outlined'}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="text"
              startIcon={<MarkEmailRead />}
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </Box>
      </Box>

      {filteredNotifications.length === 0 ? (
        <Alert severity="info">
          {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredNotifications.map((notification) => (
            <Card 
              key={notification.id}
              sx={{ 
                cursor: 'pointer',
                backgroundColor: notification.isRead ? 'background.paper' : 'action.hover',
                borderLeft: `4px solid`,
                borderLeftColor: notification.isRead ? 'grey.300' : 'primary.main',
                '&:hover': { backgroundColor: 'action.selected' }
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  {getNotificationIcon(notification.type)}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: notification.isRead ? 'normal' : 'bold',
                          fontSize: '1.1rem'
                        }}
                      >
                        {notification.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip 
                          label={notification.priority} 
                          size="small" 
                          color={getPriorityColor(notification.priority) as any}
                        />
                        {!notification.isRead && (
                          <Box 
                            sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              backgroundColor: 'primary.main' 
                            }} 
                          />
                        )}
                      </Box>
                    </Box>
                    
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      {notification.message}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </Typography>
                      
                      {(notification.case || notification.task) && (
                        <Typography variant="caption" color="primary.main">
                          {notification.case ? `Case: ${notification.case.caseName}` : ''}
                          {notification.task ? `Task: ${notification.task.title}` : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}