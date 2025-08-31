'use client';

import { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertTitle, Box, Button } from '@mui/material';
import { useNotificationStore } from '@/store/notificationStore';
import { useRouter } from 'next/navigation';

export default function NotificationToast() {
  const router = useRouter();
  const { notifications } = useNotificationStore();
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [latestNotification, setLatestNotification] = useState<any>(null);

  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) {
      const newest = notifications[0]; // Assuming notifications are sorted by newest first
      if (newest && !newest.isRead) {
        setLatestNotification(newest);
        setShowToast(true);
      }
    }
    setLastNotificationCount(notifications.length);
  }, [notifications, lastNotificationCount]);

  const handleClose = () => {
    setShowToast(false);
  };

  const handleViewNotification = () => {
    setShowToast(false);
    router.push('/notifications');
  };

  const getSeverity = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'info';
    }
  };

  if (!latestNotification) return null;

  return (
    <Snackbar
      open={showToast}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert 
        severity={getSeverity(latestNotification.priority)}
        onClose={handleClose}
        action={
          <Button color="inherit" size="small" onClick={handleViewNotification}>
            VIEW
          </Button>
        }
      >
        <AlertTitle>{latestNotification.title}</AlertTitle>
        {latestNotification.message}
      </Alert>
    </Snackbar>
  );
}