// src/app/(protected)/layout.tsx
'use client';

import SideNav from '@/components/SideNav';
import ClientRedirect from '@/components/ClientRedirect';
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
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}>
        <CircularProgress sx={{ color: '#00C49F' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ClientRedirect />
      <SideNav />
      <Box component="main" sx={{ 
        flexGrow: 1, 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        minHeight: '100vh'
      }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}