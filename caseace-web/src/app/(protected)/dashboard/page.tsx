'use client';

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Add,
  Gavel,
  AccessTime,
  Receipt,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface DashboardData {
  totalCases: number;
  activeCases: number;
  recentTimeEntries: number;
  pendingInvoices: number;
  overdueInvoices: number;
  recentRevenue: number;
}

interface RecentCase {
  id: string;
  caseName: string;
  status: string;
  client: { name: string };
  createdAt: string;
}

interface RecentTimeEntry {
  id: string;
  description: string;
  duration: number;
  case: { caseName: string };
  startTime: string;
}

interface UpcomingAppointment {
  id: string;
  title: string;
  startTime: string;
  case?: { caseName: string };
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalCases: 0,
    activeCases: 0,
    recentTimeEntries: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    recentRevenue: 0,
  });
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [recentTimeEntries, setRecentTimeEntries] = useState<RecentTimeEntry[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentCases();
    fetchRecentTimeEntries();
    fetchUpcomingAppointments();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data');
    }
  };

  const fetchRecentCases = async () => {
    try {
      const response = await api.get('/cases');
      setRecentCases(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch recent cases');
    }
  };

  const fetchRecentTimeEntries = async () => {
    try {
      const response = await api.get('/time-tracking');
      setRecentTimeEntries(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch recent time entries');
    }
  };

  const fetchUpcomingAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      const upcoming = response.data
        .filter((apt: any) => new Date(apt.startTime) > new Date())
        .slice(0, 5);
      setUpcomingAppointments(upcoming);
    } catch (error) {
      console.error('Failed to fetch appointments');
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <RoleGuard allowedRoles={['PARTNER']}>
      <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Gavel color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Cases</Typography>
              </Box>
              <Typography variant="h4">{dashboardData.totalCases}</Typography>
              <Typography variant="body2" color="textSecondary">
                {dashboardData.activeCases} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTime color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Time Entries</Typography>
              </Box>
              <Typography variant="h4">{dashboardData.recentTimeEntries}</Typography>
              <Typography variant="body2" color="textSecondary">
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Receipt color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending</Typography>
              </Box>
              <Typography variant="h4">{dashboardData.pendingInvoices}</Typography>
              <Typography variant="body2" color="textSecondary">
                Invoices
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Overdue</Typography>
              </Box>
              <Typography variant="h4">{dashboardData.overdueInvoices}</Typography>
              <Typography variant="body2" color="textSecondary">
                Invoices
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Revenue</Typography>
              </Box>
              <Typography variant="h4">
                ${dashboardData.recentRevenue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Quick Actions</Typography>
              <Button
                variant="contained"
                color="inherit"
                startIcon={<Add />}
                onClick={() => router.push('/cases')}
                sx={{ mb: 1, width: '100%' }}
              >
                New Case
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<AccessTime />}
                onClick={() => router.push('/time-tracking')}
                sx={{ width: '100%' }}
              >
                Log Time
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recent Cases</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Case</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentCases.map((case_) => (
                    <TableRow key={case_.id}>
                      <TableCell>{case_.caseName}</TableCell>
                      <TableCell>{case_.client.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={case_.status}
                          size="small"
                          color={case_.status === 'OPEN' ? 'primary' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => router.push('/cases')}
            >
              View All Cases
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recent Time Entries</Typography>
            <List>
              {recentTimeEntries.map((entry) => (
                <ListItem key={entry.id} divider>
                  <ListItemIcon>
                    <AccessTime />
                  </ListItemIcon>
                  <ListItemText
                    primary={entry.description}
                    secondary={`${entry.case?.caseName} - ${formatDuration(entry.duration || 0)}`}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => router.push('/time-tracking')}
            >
              View All Time Entries
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Upcoming Appointments</Typography>
            <List>
              {upcomingAppointments.map((appointment) => (
                <ListItem key={appointment.id} divider>
                  <ListItemIcon>
                    <Schedule />
                  </ListItemIcon>
                  <ListItemText
                    primary={appointment.title}
                    secondary={`${new Date(appointment.startTime).toLocaleDateString()} - ${appointment.case?.caseName || 'No case'}`}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => router.push('/appointments')}
            >
              View All Appointments
            </Button>
          </Paper>
        </Grid>
      </Grid>
      </Box>
    </RoleGuard>
  );
}