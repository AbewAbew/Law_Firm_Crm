'use client';

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Checkbox,
} from '@mui/material';
import { Add, Edit, Delete, PlayArrow, Stop, Cancel, Receipt, SelectAll } from '@mui/icons-material';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface TimeEntry {
  id: string;
  description: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  rate: number | null;
  status: string;
  type: string;
  billable: boolean;
  invoiceStatus: string;
  billableAmount: number | null;
  case: { id: string; caseName: string } | null;
}

interface Case {
  id: string;
  caseName: string;
}

interface ActiveTimer {
  id: string;
  description: string;
  type: string;
  startTime: string;
  case: { id: string; caseName: string } | null;
  task: { id: string; title: string } | null;
}

export default function TimeTrackingPage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [billingSummary, setBillingSummary] = useState({ unbilled: { amount: 0, count: 0 }, billed: { amount: 0, count: 0 }, paid: { amount: 0, count: 0 } });
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTimerDialog, setOpenTimerDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [form, setForm] = useState({
    caseId: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'OTHER',
    billable: true,
    rate: 250,
  });

  const [timerForm, setTimerForm] = useState({
    caseId: '',
    description: '',
    type: 'OTHER',
    rate: 250,
  });

  const timeTypes = [
    'PHONE_CALL', 'MEETING', 'EMAIL', 'RESEARCH', 
    'DRAFTING', 'COURT_APPEARANCE', 'OTHER'
  ];

  useEffect(() => {
    fetchTimeEntries();
    fetchCases();
    fetchActiveTimer();
    fetchBillingSummary();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(activeTimer.startTime).getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const fetchTimeEntries = async () => {
    try {
      const response = await api.get('/time-tracking');
      setTimeEntries(response.data);
    } catch (error) {
      toast.error('Failed to fetch time entries');
    }
  };

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases');
    }
  };

  const fetchBillingSummary = async () => {
    try {
      const response = await api.get('/time-tracking/billing-summary');
      setBillingSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch billing summary');
    }
  };

  const fetchActiveTimer = async () => {
    try {
      const response = await api.get('/time-tracking/timer/active');
      setActiveTimer(response.data);
    } catch (error) {
      // No active timer
    }
  };

  const startTimer = async () => {
    try {
      const response = await api.post('/time-tracking/timer/start', timerForm);
      setActiveTimer(response.data);
      setOpenTimerDialog(false);
      setTimerForm({ caseId: '', description: '', type: 'OTHER', rate: 250 });
      toast.success('Timer started');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start timer');
    }
  };

  const stopTimer = async () => {
    try {
      await api.post('/time-tracking/timer/stop', {});
      setActiveTimer(null);
      setElapsedTime(0);
      fetchTimeEntries();
      fetchBillingSummary();
      toast.success('Timer stopped and time entry created');
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const cancelTimer = async () => {
    if (confirm('Cancel the active timer? This will not save any time entry.')) {
      try {
        await api.delete('/time-tracking/timer/cancel');
        setActiveTimer(null);
        setElapsedTime(0);
        toast.success('Timer cancelled');
      } catch (error) {
        toast.error('Failed to cancel timer');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
      };

      if (editingEntry) {
        await api.patch(`/time-tracking/${editingEntry.id}`, data);
        toast.success('Time entry updated');
      } else {
        await api.post('/time-tracking', data);
        toast.success('Time entry created');
      }

      setOpenDialog(false);
      setEditingEntry(null);
      resetForm();
      fetchTimeEntries();
      fetchBillingSummary();
    } catch (error) {
      toast.error('Failed to save time entry');
    }
  };

  const resetForm = () => {
    setForm({
      caseId: '',
      description: '',
      startTime: '',
      endTime: '',
      type: 'OTHER',
      billable: true,
      rate: 250,
    });
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setForm({
      caseId: entry.case?.id || '',
      description: entry.description,
      startTime: new Date(entry.startTime).toISOString().slice(0, 16),
      endTime: entry.endTime ? new Date(entry.endTime).toISOString().slice(0, 16) : '',
      type: entry.type,
      billable: entry.billable,
      rate: entry.rate || 250,
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this time entry?')) {
      try {
        await api.delete(`/time-tracking/${id}`);
        toast.success('Time entry deleted');
        fetchTimeEntries();
        fetchBillingSummary();
      } catch (error) {
        toast.error('Failed to delete time entry');
      }
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleSelectAll = () => {
    const unbilledEntries = timeEntries.filter(entry => entry.invoiceStatus === 'UNBILLED' && entry.billable);
    setSelectedEntries(unbilledEntries.map(entry => entry.id));
  };

  const createInvoiceFromSelected = async () => {
    if (selectedEntries.length === 0) {
      toast.error('Please select time entries to invoice');
      return;
    }
    
    try {
      const response = await api.post('/billing/draft-from-time-entries', {
        timeEntryIds: selectedEntries,
      });
      
      toast.success(`Draft invoice created: ${response.data.invoiceNumber}`);
      setSelectedEntries([]);
      fetchTimeEntries();
      fetchBillingSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  return (
    <RoleGuard allowedRoles={['PARALEGAL', 'ASSOCIATE', 'PARTNER']}>
      <Box sx={{ p: 3 }}>
      {/* Billing Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Unbilled</Typography>
              <Typography variant="h4">${(billingSummary.unbilled?.amount || 0).toFixed(2)}</Typography>
              <Typography variant="body2">{billingSummary.unbilled?.count || 0} entries</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">Billed</Typography>
              <Typography variant="h4">${(billingSummary.billed?.amount || 0).toFixed(2)}</Typography>
              <Typography variant="body2">{billingSummary.billed?.count || 0} entries</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">Paid</Typography>
              <Typography variant="h4">${(billingSummary.paid?.amount || 0).toFixed(2)}</Typography>
              <Typography variant="body2">{billingSummary.paid?.count || 0} entries</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Time Tracking</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeTimer ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="h6">{formatElapsedTime(elapsedTime)}</Typography>
                <Typography variant="body2">{activeTimer.description}</Typography>
              </Paper>
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={stopTimer}
              >
                Stop
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={cancelTimer}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayArrow />}
              onClick={() => setOpenTimerDialog(true)}
            >
              Start Timer
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Add Manual Entry
          </Button>
        </Box>
      </Box>

      {/* Selection Controls */}
      {selectedEntries.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {selectedEntries.length} entries selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Receipt />}
              onClick={createInvoiceFromSelected}
            >
              Create Invoice
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedEntries([])}
            >
              Clear Selection
            </Button>
          </Box>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<SelectAll />}
          onClick={handleSelectAll}
        >
          Select All Unbilled
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedEntries.length > 0 && selectedEntries.length < timeEntries.filter(e => e.invoiceStatus === 'UNBILLED' && e.billable).length}
                  checked={selectedEntries.length > 0 && selectedEntries.length === timeEntries.filter(e => e.invoiceStatus === 'UNBILLED' && e.billable).length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Case</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Rate</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Invoice Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedEntries.includes(entry.id)}
                    onChange={() => handleSelectEntry(entry.id)}
                    disabled={entry.invoiceStatus !== 'UNBILLED' || !entry.billable}
                  />
                </TableCell>
                <TableCell>{entry.case?.caseName || '-'}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{entry.type}</TableCell>
                <TableCell>
                  {new Date(entry.startTime).toLocaleString()}
                </TableCell>
                <TableCell>{formatDuration(entry.duration)}</TableCell>
                <TableCell>${entry.rate}</TableCell>
                <TableCell>
                  {entry.billableAmount ? `$${entry.billableAmount.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={entry.invoiceStatus || 'UNBILLED'}
                    color={entry.invoiceStatus === 'PAID' ? 'success' : entry.invoiceStatus === 'BILLED' ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(entry)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(entry.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingEntry ? 'Edit' : 'Add'} Time Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Case"
              value={form.caseId}
              onChange={(e) => setForm({ ...form, caseId: e.target.value })}
              fullWidth
            >
              {cases.map((case_) => (
                <MenuItem key={case_.id} value={case_.id}>
                  {case_.caseName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              fullWidth
            >
              {timeTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Start Time"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Time"
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hourly Rate"
              type="number"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEntry ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Start Timer Dialog */}
      <Dialog open={openTimerDialog} onClose={() => setOpenTimerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Timer</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Case (optional)"
              value={timerForm.caseId}
              onChange={(e) => setTimerForm({ ...timerForm, caseId: e.target.value })}
              fullWidth
            >
              <MenuItem value="">No case selected</MenuItem>
              {cases.map((case_) => (
                <MenuItem key={case_.id} value={case_.id}>
                  {case_.caseName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={timerForm.description}
              onChange={(e) => setTimerForm({ ...timerForm, description: e.target.value })}
              fullWidth
              required
              placeholder="What are you working on?"
            />
            <TextField
              select
              label="Type"
              value={timerForm.type}
              onChange={(e) => setTimerForm({ ...timerForm, type: e.target.value })}
              fullWidth
            >
              {timeTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Hourly Rate (optional)"
              type="number"
              value={timerForm.rate}
              onChange={(e) => setTimerForm({ ...timerForm, rate: Number(e.target.value) })}
              fullWidth
              placeholder="250"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTimerDialog(false)}>Cancel</Button>
          <Button onClick={startTimer} variant="contained" color="success">
            Start Timer
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </RoleGuard>
  );
}