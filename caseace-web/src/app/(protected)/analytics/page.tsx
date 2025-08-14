'use client';

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface DashboardMetrics {
  totalCases: number;
  activeCases: number;
  recentTimeEntries: number;
  pendingInvoices: number;
  overdueInvoices: number;
  recentRevenue: number;
}

interface FinancialData {
  monthlyTrends: Array<{
    month: string;
    invoiced: number;
    paid: number;
    outstanding: number;
  }>;
  practiceAreas: Array<{
    practiceArea: string;
    invoiced: number;
    paid: number;
    count: number;
  }>;
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    averageInvoiceValue: number;
  };
}

interface ProductivityData {
  user: { name: string; email: string };
  totalHours: number;
  billableHours: number;
  entries: number;
  casesWorked: number;
  utilizationRate: number;
}

const COLORS = ['#00D9FF', '#00C49F', '#10B981', '#06B6D4', '#8B5CF6'];

export default function AnalyticsPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalCases: 0,
    activeCases: 0,
    recentTimeEntries: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    recentRevenue: 0,
  });
  
  const [financialData, setFinancialData] = useState<FinancialData>({
    monthlyTrends: [],
    practiceAreas: [],
    summary: { totalInvoiced: 0, totalPaid: 0, averageInvoiceValue: 0 },
  });
  
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchDashboardMetrics();
    fetchFinancialAnalytics();
    fetchProductivityAnalytics();
  }, [dateRange]);

  const fetchDashboardMetrics = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setDashboardMetrics(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard metrics');
    }
  };

  const fetchFinancialAnalytics = async () => {
    try {
      const response = await api.get(`/analytics/financial?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      setFinancialData(response.data);
    } catch (error) {
      toast.error('Failed to fetch financial analytics');
    }
  };

  const fetchProductivityAnalytics = async () => {
    try {
      const response = await api.get(`/analytics/productivity?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      setProductivityData(response.data);
    } catch (error) {
      toast.error('Failed to fetch productivity analytics');
    }
  };

  return (
    <RoleGuard allowedRoles={['PARTNER']}>
      <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ 
        mb: 4, 
        color: '#ffffff',
        fontWeight: 600,
        fontSize: '2rem'
      }}>Analytics Dashboard</Typography>

      {/* Date Range Selector */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <TextField
          label="Start Date"
          type="date"
          value={dateRange.startDate}
          onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
              '&:hover fieldset': { borderColor: '#00C49F' },
              '&.Mui-focused fieldset': { borderColor: '#00C49F' }
            },
            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
            '& .MuiInputBase-input': { color: '#ffffff' }
          }}
        />
        <TextField
          label="End Date"
          type="date"
          value={dateRange.endDate}
          onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
              '&:hover fieldset': { borderColor: '#00C49F' },
              '&.Mui-focused fieldset': { borderColor: '#00C49F' }
            },
            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
            '& .MuiInputBase-input': { color: '#ffffff' }
          }}
        />
      </Box>

      {/* Dashboard Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={2}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(0, 196, 159, 0.1)'
            }
          }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>Total Cases</Typography>
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700 }}>{dashboardMetrics.totalCases}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(0, 196, 159, 0.1) 0%, rgba(0, 196, 159, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 196, 159, 0.2)',
            borderRadius: '16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(0, 196, 159, 0.2)'
            }
          }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>Active Cases</Typography>
              <Typography variant="h4" sx={{ color: '#00C49F', fontWeight: 700 }}>{dashboardMetrics.activeCases}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(0, 217, 255, 0.1)'
            }
          }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>Time Entries</Typography>
              <Typography variant="h4" sx={{ color: '#00D9FF', fontWeight: 700 }}>{dashboardMetrics.recentTimeEntries}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(255, 193, 7, 0.1)'
            }
          }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>Pending Invoices</Typography>
              <Typography variant="h4" sx={{ color: '#FFC107', fontWeight: 700 }}>{dashboardMetrics.pendingInvoices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(244, 67, 54, 0.1)'
            }
          }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>Overdue</Typography>
              <Typography variant="h4" sx={{ color: '#F44336', fontWeight: 700 }}>{dashboardMetrics.overdueInvoices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.2)'
            }
          }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>Revenue</Typography>
              <Typography variant="h4" sx={{ color: '#10B981', fontWeight: 700 }}>
                ${dashboardMetrics.recentRevenue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px'
          }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#ffffff', fontWeight: 600 }}>Monthly Financial Trends</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financialData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255, 255, 255, 0.7)' }} />
                <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.7)' }} />
                <Tooltip 
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#ffffff'
                  }}
                />
                <Legend wrapperStyle={{ color: '#ffffff' }} />
                <Bar dataKey="invoiced" fill="#00D9FF" name="Invoiced" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" fill="#00C49F" name="Paid" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outstanding" fill="#FFC107" name="Outstanding" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Staff Productivity */}
      <Paper sx={{ 
        p: 3, 
        mb: 4,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px'
      }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#ffffff', fontWeight: 600 }}>Staff Productivity</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>Staff Member</TableCell>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>Total Hours</TableCell>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>Billable Hours</TableCell>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>Utilization Rate</TableCell>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>Cases Worked</TableCell>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>Time Entries</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productivityData.map((staff, index) => (
                <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } }}>
                  <TableCell sx={{ color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{staff.user.name}</TableCell>
                  <TableCell sx={{ color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{staff.totalHours.toFixed(1)}h</TableCell>
                  <TableCell sx={{ color: '#00C49F', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontWeight: 600 }}>{staff.billableHours.toFixed(1)}h</TableCell>
                  <TableCell sx={{ 
                    color: staff.utilizationRate >= 80 ? '#00C49F' : staff.utilizationRate >= 60 ? '#FFC107' : '#F44336',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    fontWeight: 600
                  }}>{staff.utilizationRate.toFixed(1)}%</TableCell>
                  <TableCell sx={{ color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{staff.casesWorked}</TableCell>
                  <TableCell sx={{ color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{staff.entries}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Financial Summary */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '20px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(0, 217, 255, 0.2)'
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>Total Invoiced</Typography>
              <Typography variant="h4" sx={{ color: '#00D9FF', fontWeight: 700 }}>
                ${financialData.summary.totalInvoiced.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(0, 196, 159, 0.1) 0%, rgba(0, 196, 159, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 196, 159, 0.2)',
            borderRadius: '20px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(0, 196, 159, 0.2)'
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>Total Paid</Typography>
              <Typography variant="h4" sx={{ color: '#00C49F', fontWeight: 700 }}>
                ${financialData.summary.totalPaid.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '20px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.2)'
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>Average Invoice</Typography>
              <Typography variant="h4" sx={{ color: '#10B981', fontWeight: 700 }}>
                ${financialData.summary.averageInvoiceValue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Box>
    </RoleGuard>
  );
}