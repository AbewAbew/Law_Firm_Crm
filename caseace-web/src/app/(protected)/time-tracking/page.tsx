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
  Pagination,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Add, Edit, Delete, PlayArrow, Stop, Cancel, Receipt, SelectAll } from '@mui/icons-material';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

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
  user?: { id: string; name: string; role: string };
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
  const { user } = useAuthStore();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [billingSummary, setBillingSummary] = useState({ unbilled: { amount: 0, count: 0 }, billed: { amount: 0, count: 0 }, paid: { amount: 0, count: 0 } });
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const entriesPerPage = 10;
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<Case | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
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
  const [timeInputMode, setTimeInputMode] = useState<'datetime' | 'duration'>('duration');
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);

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
    fetchCases();
    if (user) {
      fetchTimeEntries();
      fetchActiveTimer();
      if (user.role === 'PARTNER' && currentTab === 0) {
        fetchBillingSummary();
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTimeEntries();
      if (user.role === 'PARTNER' && currentTab === 0) {
        fetchBillingSummary();
      }
    }
  }, [currentTab, user]);

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
      const endpoint = user?.role === 'PARTNER' && currentTab === 0 
        ? '/time-tracking/all-staff' 
        : '/time-tracking';
      const response = await api.get(endpoint);
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
    if (!user?.sub) {
      console.log('No user ID available, skipping billing summary');
      return;
    }
    
    try {
      const endpoint = user?.role === 'PARTNER' && currentTab === 0 
        ? '/time-tracking/billing-summary/all-staff' 
        : '/time-tracking/billing-summary';
      console.log('Fetching billing summary:', { endpoint, userId: user.sub, currentTab });
      const response = await api.get(endpoint);
      console.log('Billing summary response:', response.data);
      setBillingSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch billing summary:', error);
      console.error('Error details:', error.response?.data);
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
      const payload = {
        ...timerForm,
        caseId: timerForm.caseId || undefined,
      };
      const response = await api.post('/time-tracking/timer/start', payload);
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
    setTimeInputMode('duration');
    setDurationHours(1);
    setDurationMinutes(0);
  };

  const formatLocalDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const setQuickDuration = (hours: number, minutes: number = 0) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    const now = new Date();
    const endTime = new Date(now.getTime() + (hours * 60 + minutes) * 60000);
    setForm({
      ...form,
      startTime: formatLocalDateTime(now),
      endTime: formatLocalDateTime(endTime)
    });
  };

  const handleDurationChange = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + (durationHours * 60 + durationMinutes) * 60000);
    setForm({
      ...form,
      startTime: formatLocalDateTime(now),
      endTime: formatLocalDateTime(endTime)
    });
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setForm({
      caseId: entry.case?.id || '',
      description: entry.description,
      startTime: formatLocalDateTime(new Date(entry.startTime)),
      endTime: entry.endTime ? formatLocalDateTime(new Date(entry.endTime)) : '',
      type: entry.type,
      billable: entry.billable,
      rate: entry.rate || 250,
    });
    setTimeInputMode('datetime');
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

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // Filter time entries by selected case
  const filteredEntries = selectedCaseFilter 
    ? timeEntries.filter(entry => entry.case?.id === selectedCaseFilter.id)
    : timeEntries;

  // Calculate pagination
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (page - 1) * entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + entriesPerPage);

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
      {/* Billing Summary Cards - Only show for Partners on All Staff Time tab */}
      {user?.role === 'PARTNER' && currentTab === 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary">Unbilled</Typography>
                <Typography variant="h4">${(billingSummary.unbilled?.amount || 0).toFixed(2)}</Typography>
                <Typography variant="body2">{billingSummary.unbilled?.count || 0} entries</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">Billed</Typography>
                <Typography variant="h4">${(billingSummary.billed?.amount || 0).toFixed(2)}</Typography>
                <Typography variant="body2">{billingSummary.billed?.count || 0} entries</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs for Partners */}
      {user?.role === 'PARTNER' && (
        <Box sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab label="All Staff Time" />
            <Tab label="My Time" />
          </Tabs>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {user?.role === 'PARTNER' ? (currentTab === 0 ? 'All Staff Time Tracking' : 'My Time Tracking') : 'Time Tracking'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Autocomplete
            options={cases}
            getOptionLabel={(option) => option.caseName}
            value={selectedCaseFilter}
            onChange={(_, newValue) => setSelectedCaseFilter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Case"
                size="small"
                placeholder="Type or select a case"
              />
            )}
            sx={{ minWidth: 250 }}
            clearOnEscape
            blurOnSelect
          />
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
              {user?.role === 'PARTNER' && currentTab === 0 && <TableCell>Staff Member</TableCell>}
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
            {paginatedEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedEntries.includes(entry.id)}
                    onChange={() => handleSelectEntry(entry.id)}
                    disabled={entry.invoiceStatus !== 'UNBILLED' || !entry.billable}
                  />
                </TableCell>
                <TableCell>{entry.case?.caseName || '-'}</TableCell>
                {user?.role === 'PARTNER' && currentTab === 0 && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{entry.user?.name || 'Unknown'}</Typography>
                      <Chip 
                        label={entry.user?.role || 'N/A'} 
                        size="small" 
                        variant="outlined"
                        color={entry.user?.role === 'PARTNER' ? 'primary' : entry.user?.role === 'ASSOCIATE' ? 'secondary' : 'default'}
                      />
                    </Box>
                  </TableCell>
                )}
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

      {/* Pagination */}
      {filteredEntries.length > entriesPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

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
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={timeInputMode === 'duration' ? 'contained' : 'outlined'}
                onClick={() => setTimeInputMode('duration')}
                size="small"
              >
                Duration
              </Button>
              <Button
                variant={timeInputMode === 'datetime' ? 'contained' : 'outlined'}
                onClick={() => setTimeInputMode('datetime')}
                size="small"
              >
                Date & Time
              </Button>
            </Box>

            {timeInputMode === 'duration' ? (
              <>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small" onClick={() => setQuickDuration(0, 15)}>15m</Button>
                  <Button variant="outlined" size="small" onClick={() => setQuickDuration(0, 30)}>30m</Button>
                  <Button variant="outlined" size="small" onClick={() => setQuickDuration(1)}>1h</Button>
                  <Button variant="outlined" size="small" onClick={() => setQuickDuration(2)}>2h</Button>
                  <Button variant="outlined" size="small" onClick={() => setQuickDuration(4)}>4h</Button>
                  <Button variant="outlined" size="small" onClick={() => setQuickDuration(8)}>8h</Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Hours"
                    type="number"
                    value={durationHours}
                    onChange={(e) => {
                      setDurationHours(Number(e.target.value));
                      setTimeout(handleDurationChange, 100);
                    }}
                    inputProps={{ min: 0, max: 24 }}
                    sx={{ width: 100 }}
                  />
                  <TextField
                    label="Minutes"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => {
                      setDurationMinutes(Number(e.target.value));
                      setTimeout(handleDurationChange, 100);
                    }}
                    inputProps={{ min: 0, max: 59 }}
                    sx={{ width: 100 }}
                  />
                </Box>
              </>
            ) : (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Start Time"
                  value={form.startTime ? new Date(form.startTime) : null}
                  onChange={(newValue) => setForm({ ...form, startTime: newValue ? newValue.toISOString().slice(0, 16) : '' })}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
                <DateTimePicker
                  label="End Time"
                  value={form.endTime ? new Date(form.endTime) : null}
                  onChange={(newValue) => setForm({ ...form, endTime: newValue ? newValue.toISOString().slice(0, 16) : '' })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            )}
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
            <Autocomplete
              options={cases}
              getOptionLabel={(option) => option.caseName}
              value={cases.find(c => c.id === timerForm.caseId) || null}
              onChange={(_, newValue) => setTimerForm({ ...timerForm, caseId: newValue?.id || '' })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Case (optional)"
                  placeholder="Select a case or leave empty"
                />
              )}
              fullWidth
              clearOnEscape
              blurOnSelect
            />
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