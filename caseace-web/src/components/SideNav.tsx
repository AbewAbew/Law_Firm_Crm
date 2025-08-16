// src/components/SideNav.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GavelIcon from '@mui/icons-material/Gavel';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PeopleIcon from '@mui/icons-material/People';
import TaskIcon from '@mui/icons-material/Task';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LogoutIcon from '@mui/icons-material/Logout';
import { Divider } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import Image from 'next/image';

const drawerWidth = 240;

interface MenuItem {
  text: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

export default function SideNav() {
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const allMenuItems: MenuItem[] = [
    { text: 'Dashboard', href: '/dashboard', icon: <DashboardIcon />, roles: ['PARTNER'] },
    { text: 'Cases', href: '/cases', icon: <GavelIcon />, roles: ['CLIENT', 'PARALEGAL', 'ASSOCIATE', 'PARTNER'] },
    { text: 'Appointments', href: '/appointments', icon: <EventIcon />, roles: ['CLIENT', 'PARALEGAL', 'ASSOCIATE', 'PARTNER'] },
    { text: 'Tasks', href: '/tasks', icon: <TaskIcon />, roles: ['PARALEGAL', 'ASSOCIATE', 'PARTNER'] },
    { text: 'Time Tracking', href: '/time-tracking', icon: <AccessTimeIcon />, roles: ['PARALEGAL', 'ASSOCIATE', 'PARTNER'] },
    { text: 'Billing', href: '/billing', icon: <ReceiptIcon />, roles: ['CLIENT', 'PARTNER'] },
    { text: 'Legal Assistant', href: '/legal-assistant', icon: <SmartToyIcon />, roles: ['PARALEGAL', 'ASSOCIATE', 'PARTNER'] },
    { text: 'Analytics', href: '/analytics', icon: <AnalyticsIcon />, roles: ['PARTNER'] },
    { text: 'Users', href: '/users', icon: <PeopleIcon />, roles: ['PARTNER'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to login
      router.push('/login');
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
        },
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', py: 1 }}>
          <Image
            src="/logo.png"
            alt="Company Logo"
            width={160}
            height={19}
          />
        </Box>
      </Toolbar>
      <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <List sx={{ flexGrow: 1, px: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                component={Link} 
                href={item.href}
                sx={{
                  borderRadius: '12px',
                  mx: 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: '#f3f4f6',
                    transform: 'translateX(4px)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#374151',
                    minWidth: '40px',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#000000',
                    fontWeight: 500,
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ borderColor: '#e5e7eb', mx: 2 }} />
        <List sx={{ px: 1 }}>
          <ListItem disablePadding>
            <ListItemButton 
              onClick={handleLogout}
              sx={{
                borderRadius: '12px',
                mx: 1,
                mb: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: '#fef2f2',
                  transform: 'translateX(4px)',
                },
                '& .MuiListItemIcon-root': {
                  color: '#dc2626',
                  minWidth: '40px',
                },
                '& .MuiListItemText-primary': {
                  color: '#dc2626',
                  fontWeight: 500,
                },
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}