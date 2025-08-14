'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
      
      if (!allowedRoles.includes(response.data.role)) {
        router.push('/cases'); // Redirect to cases page if not authorized
      }
    } catch (error) {
      console.error('Failed to fetch user profile');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Access Denied
          </Typography>
          <Typography>
            You don't have permission to access this page.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
}