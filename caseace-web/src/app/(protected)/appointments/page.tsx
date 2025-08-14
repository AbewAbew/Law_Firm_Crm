'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import AddIcon from '@mui/icons-material/Add';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import AppointmentCalendar from '@/components/AppointmentCalendar';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface AttendeeLink {
  user: {
    id: string;
    name: string | null;
  };
}

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  attendeeLinks: AttendeeLink[];
  createdBy: {
    id: string;
    name: string | null;
  };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openTimeEntry, setOpenTimeEntry] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000),
    attendeeIds: [] as string[],
  });
  const [timeEntryForm, setTimeEntryForm] = useState({
    description: '',
    rate: 250,
    type: 'MEETING',
  });

  useEffect(() => {
    fetchUserProfile();
    fetchAppointments();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
      
      if (response.data.role !== 'CLIENT') {
        fetchUsers();
      } else {
        setLoadingUsers(false);
      }
    } catch (error) {
      console.error('Failed to fetch user profile');
      setLoadingUsers(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await api.get('/appointments');
      setAppointments(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch appointments.';
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      try {
        const authResponse = await api.get('/auth/users');
        setUsers(authResponse.data);
      } catch (authErr) {
        console.error('Failed to fetch users from auth:', authErr);
        toast.error('Unable to load users for appointment scheduling');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenCreate = (appointment: Appointment | null = null) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setForm({
        title: appointment.title,
        description: appointment.description || '',
        startTime: new Date(appointment.startTime),
        endTime: new Date(appointment.endTime),
        attendeeIds: appointment.attendeeLinks?.map(a => a.user?.id).filter(Boolean) || [],
      });
    } else {
      setEditingAppointment(null);
      setForm({
        title: '',
        description: '',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        attendeeIds: [],
      });
    }
    setOpenCreate(true);
  };

  const handleCloseCreate = () => {
    if (!isSubmitting) {
      setOpenCreate(false);
      setEditingAppointment(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDateTimeChange = (name: 'startTime' | 'endTime', value: Date | null) => {
    if (value) {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitAppointment = async () => {
    if (!form.title.trim() || form.attendeeIds.length === 0) {
      toast.error('Title and at least one attendee are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        startTime: form.startTime.toISOString(),
        endTime: form.endTime.toISOString(),
        attendeeIds: form.attendeeIds,
      };

      if (editingAppointment) {
        await api.patch(`/appointments/${editingAppointment.id}`, data);
        toast.success('Appointment updated');
      } else {
        await api.post('/appointments', data);
        toast.success('Appointment scheduled');
      }

      handleCloseCreate();
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || 
        (editingAppointment ? 'Failed to update appointment' : 'Failed to schedule appointment');
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await api.delete(`/appointments/${id}`);
        toast.success('Appointment deleted');
        
        const response = await api.get('/appointments');
        setAppointments(response.data);
      } catch (err: any) {
        console.error(err);
        const message = err?.response?.data?.message || 'Failed to delete appointment';
        toast.error(Array.isArray(message) ? message.join(', ') : message);
      }
    }
  };

  const handleConvertToTimeEntry = async () => {
    if (!selectedAppointment) return;
    
    try {
      await api.post(`/appointments/${selectedAppointment.id}/convert-to-time-entry`, {
        description: timeEntryForm.description || `Meeting: ${selectedAppointment.title}`,
        rate: timeEntryForm.rate,
        type: timeEntryForm.type,
      });
      toast.success('Appointment converted to time entry');
      setOpenTimeEntry(false);
      setSelectedAppointment(null);
      setTimeEntryForm({ description: '', rate: 250, type: 'MEETING' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to convert appointment');
    }
  };

  const openConvertDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setTimeEntryForm({
      description: `Meeting: ${appointment.title}`,
      rate: 250,
      type: 'MEETING',
    });
    setOpenTimeEntry(true);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            My Appointments
          </Typography>
          {userRole !== 'CLIENT' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenCreate()}
            >
              Schedule Appointment
            </Button>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
          <Paper sx={{ p: 3 }}>
            <AppointmentCalendar 
              appointments={appointments} 
              onEventClick={(event) => {
                const appointment = appointments.find(a => a.id === event.id);
                if (appointment) {
                  handleOpenCreate(appointment);
                }
              }}
            />
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Upcoming Appointments</Typography>
              {appointments.length === 0 ? (
                <Typography>No upcoming appointments</Typography>
              ) : (
                appointments.map((appointment) => (
                  <Paper key={appointment.id} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">{appointment.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(appointment.startTime).toLocaleString()} - {new Date(appointment.endTime).toLocaleTimeString()}
                      </Typography>
                      {appointment.description && (
                        <Typography variant="body2" sx={{ mt: 1 }}>{appointment.description}</Typography>
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        With: {appointment.attendeeLinks?.map(a => a.user?.name).filter(Boolean).join(', ') || 'N/A'}
                      </Typography>
                    </Box>
                    {userRole !== 'CLIENT' && (
                      <Box>
                        <Button 
                          size="small" 
                          startIcon={<AccessTimeIcon />}
                          onClick={() => openConvertDialog(appointment)}
                          sx={{ mr: 1 }}
                        >
                          Log Time
                        </Button>
                        <Button 
                          size="small" 
                          onClick={() => handleOpenCreate(appointment)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    )}
                  </Paper>
                ))
              )}
            </Box>
          </Paper>
        )}

        <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm">
          <DialogTitle>
            {editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                autoFocus
                margin="dense"
                name="title"
                label="Title"
                type="text"
                fullWidth
                variant="outlined"
                value={form.title}
                onChange={handleChange}
                required
              />

              <TextField
                margin="dense"
                name="description"
                label="Description"
                type="text"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={form.description}
                onChange={handleChange}
              />

              <DateTimePicker
                label="Start Time"
                value={form.startTime}
                onChange={(newValue: Date | null) => handleDateTimeChange('startTime', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'dense',
                    variant: 'outlined',
                  },
                }}
              />

              <DateTimePicker
                label="End Time"
                value={form.endTime}
                minDateTime={form.startTime}
                onChange={(newValue: Date | null) => handleDateTimeChange('endTime', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'dense',
                    variant: 'outlined',
                  },
                }}
              />

              <FormControl fullWidth margin="dense" required>
                <InputLabel id="attendees-label">Attendees</InputLabel>
                <Select
                  labelId="attendees-label"
                  name="attendeeIds"
                  multiple
                  value={form.attendeeIds}
                  label="Attendees"
                  onChange={(e) => setForm({ ...form, attendeeIds: e.target.value as string[] })}
                  disabled={loadingUsers}
                  renderValue={(selected) => {
                    const selectedUsers = users.filter(user => selected.includes(user.id));
                    return selectedUsers.map(user => user.name || user.email).join(', ');
                  }}
                >
                  {loadingUsers ? (
                    <MenuItem disabled>Loading users...</MenuItem>
                  ) : (
                    users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name || user.email} ({user.role})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreate} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAppointment}
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? (editingAppointment ? 'Updating...' : 'Scheduling...') 
                : (editingAppointment ? 'Update' : 'Schedule')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openTimeEntry} onClose={() => setOpenTimeEntry(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Convert Appointment to Time Entry</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Description"
                value={timeEntryForm.description}
                onChange={(e) => setTimeEntryForm({ ...timeEntryForm, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Hourly Rate"
                type="number"
                value={timeEntryForm.rate}
                onChange={(e) => setTimeEntryForm({ ...timeEntryForm, rate: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                select
                label="Activity Type"
                value={timeEntryForm.type}
                onChange={(e) => setTimeEntryForm({ ...timeEntryForm, type: e.target.value })}
                fullWidth
              >
                <MenuItem value="MEETING">Meeting</MenuItem>
                <MenuItem value="PHONE_CALL">Phone Call</MenuItem>
                <MenuItem value="COURT_APPEARANCE">Court Appearance</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTimeEntry(false)}>Cancel</Button>
            <Button onClick={handleConvertToTimeEntry} variant="contained">
              Create Time Entry
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}