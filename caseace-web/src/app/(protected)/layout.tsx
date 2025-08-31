// src/app/(protected)/layout.tsx
'use client';

import SideNav from '@/components/SideNav';
import ClientRedirect from '@/components/ClientRedirect';
import NotificationToast from '@/components/NotificationToast';
import { useAuthStore } from '@/store/authStore';
import { Box, CircularProgress, Toolbar } from '@mui/material';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, fetchUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  if (isLoading && !user) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f7f7f8'
      }}>
        <CircularProgress sx={{ color: '#000000' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ClientRedirect />
      <SideNav />
      <Box component="main" sx={{ 
        flexGrow: 1, 
        background: '#f7f7f8',
        minHeight: '100vh'
      }}>
        <Toolbar />
        {children}
      </Box>
      <NotificationToast />
    </Box>
  );
}