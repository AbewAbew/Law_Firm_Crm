// PASTE THIS ENTIRE BLOCK INTO src/app/(protected)/cases/[caseId]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
  Alert,
  Paper,
  Divider,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  MenuItem,
} from '@mui/material';
import api from '@/lib/axios';
import { useParams } from 'next/navigation';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Autocomplete, Grid } from '@mui/material';
import DocumentUploader from '@/components/DocumentUploader';
import toast from 'react-hot-toast';

// --- TYPE DEFINITIONS ---
interface CaseDetail {
  id: string;
  caseName: string;
  caseNumber: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  client: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  assignedTo: {
    id: string;
    name: string | null;
  };
}

interface DocumentType {
  id: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string | null;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface TimeEntry {
  id: string;
  description: string;
  startTime: string;
  duration: number | null;
  rate: number | null;
  billableAmount: number | null;
  invoiceStatus: string;
  user: { name: string | null };
}

interface ActiveTimer {
  id: string;
  description: string;
  startTime: string;
}

// --- VIEW COMPONENTS ---

function TimeTrackingWidget({ caseId }: { caseId: string }) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [unbilledTotal, setUnbilledTotal] = useState(0);
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [openTimerDialog, setOpenTimerDialog] = useState(false);
  const [timerForm, setTimerForm] = useState({ description: '', type: 'OTHER', rate: 250 });

  useEffect(() => {
    fetchUserProfile();
    fetchCaseTimeEntries();
    fetchActiveTimer();
  }, [caseId]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchCaseTimeEntries = async () => {
    try {
      const response = await api.get(`/time-tracking?caseId=${caseId}`);
      const entries = response.data.filter((entry: TimeEntry) => entry.invoiceStatus === 'UNBILLED');
      setTimeEntries(entries);
      const total = entries.reduce((sum: number, entry: TimeEntry) => sum + (entry.billableAmount || 0), 0);
      setUnbilledTotal(total);
    } catch (error) {
      console.error('Failed to fetch time entries');
    }
  };

  const fetchActiveTimer = async () => {
    try {
      const response = await api.get('/time-tracking/timer/active');
      if (response.data && response.data.caseId === caseId) {
        setActiveTimer(response.data);
      }
    } catch (error) {
      // No active timer
    }
  };

  const startTimer = async () => {
    try {
      await api.post('/time-tracking/timer/start', { ...timerForm, caseId });
      setOpenTimerDialog(false);
      setTimerForm({ description: '', type: 'OTHER', rate: 250 });
      fetchActiveTimer();
      toast.success('Timer started for this case');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start timer');
    }
  };

  const stopTimer = async () => {
    try {
      await api.post('/time-tracking/timer/stop', {});
      setActiveTimer(null);
      fetchCaseTimeEntries();
      toast.success('Timer stopped and time entry created');
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const generateInvoice = async () => {
    try {
      const timeEntryIds = timeEntries.map(entry => entry.id);
      const response = await api.post('/billing/draft-from-time-entries', {
        caseId,
        timeEntryIds,
      });
      
      toast.success(`Draft invoice created: ${response.data.invoiceNumber}`);
      fetchCaseTimeEntries(); // Refresh to show updated status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  if (userRole === 'CLIENT') return null;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccessTimeIcon /> Time Tracking
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="subtitle2">Unbilled Time</Typography>
            <Typography variant="h4">${unbilledTotal.toFixed(2)}</Typography>
            <Typography variant="body2">{timeEntries.length} entries</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activeTimer ? (
              <Button
                variant="contained"
                color="error"
                onClick={stopTimer}
                fullWidth
              >
                Stop Timer
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayArrowIcon />}
                onClick={() => setOpenTimerDialog(true)}
                fullWidth
              >
                Start Timer
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              disabled={timeEntries.length === 0}
              onClick={generateInvoice}
              fullWidth
            >
              Generate Invoice
            </Button>
          </Box>
        </Grid>
      </Grid>

      {timeEntries.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Recent Unbilled Entries</Typography>
          {timeEntries.slice(0, 3).map((entry) => (
            <Box key={entry.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">{entry.description}</Typography>
              <Typography variant="body2">${(entry.billableAmount || 0).toFixed(2)}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={openTimerDialog} onClose={() => setOpenTimerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Timer for Case</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={timerForm.description}
              onChange={(e) => setTimerForm({ ...timerForm, description: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label="Type"
              value={timerForm.type}
              onChange={(e) => setTimerForm({ ...timerForm, type: e.target.value })}
              fullWidth
            >
              {['PHONE_CALL', 'MEETING', 'EMAIL', 'RESEARCH', 'DRAFTING', 'COURT_APPEARANCE', 'OTHER'].map((type) => (
                <MenuItem key={type} value={type}>{type.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Hourly Rate"
              type="number"
              value={timerForm.rate}
              onChange={(e) => setTimerForm({ ...timerForm, rate: Number(e.target.value) })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTimerDialog(false)}>Cancel</Button>
          <Button onClick={startTimer} variant="contained" color="success">
            Start Timer
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function CaseDetailsView({ caseDetail }: { caseDetail: CaseDetail }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Client Name</Typography><Typography>{caseDetail.client.name}</Typography></Box>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Client Email</Typography><Typography>{caseDetail.client.email}</Typography></Box>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Status</Typography><Typography>{caseDetail.status}</Typography></Box>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Date Opened</Typography><Typography>{new Date(caseDetail.createdAt).toLocaleDateString()}</Typography></Box>
      <Box sx={{ flex: '1 1 100%' }}><Typography variant="overline" color="text.secondary">Description</Typography><Typography>{caseDetail.description || 'No description provided.'}</Typography></Box>
    </Box>
  );
}

function TasksView({ caseId }: { caseId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    deadline: '', 
    assignedToId: '' 
  });

  useEffect(() => {
    if (!caseId) return;
    fetchUserProfile();
  }, [caseId]);

  useEffect(() => {
    if (userRole && userRole !== 'CLIENT') {
      fetchTasks();
      fetchUsers();
    } else if (userRole === 'CLIENT') {
      setLoading(false);
    }
  }, [userRole, caseId]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchTasks = async () => {
    try {
      setError(''); setLoading(true);
      const response = await api.get(`/cases/${caseId}/tasks`);
      setTasks(response.data);
    } catch (err) { setError('Failed to fetch tasks.'); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const staffUsers = response.data.filter((user: User) => 
        ['PARTNER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)
      );
      setUsers(staffUsers);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };





  const handleOpenCreate = () => setOpenCreate(true);
  const handleCloseCreate = () => {
    if (!creating) {
      setOpenCreate(false);
      setForm({ title: '', description: '', deadline: '', assignedToId: '' });
      setSelectedUser(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTask = async () => {
    if (!form.title.trim() || !selectedUser) {
      toast.error('Title and Assignee are required');
      return;
    }
    try {
      setCreating(true);
      // Format the deadline to ISO string if it exists
      const deadline = form.deadline ? new Date(form.deadline).toISOString() : null;
      
      await api.post(`/cases/${caseId}/tasks`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        deadline: deadline,
        assignedToId: selectedUser.id,
        caseId: caseId,
      });
      toast.success('Task created');
      handleCloseCreate();
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || 'Failed to create task';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{mt: 2}}>{error}</Alert>;

  // Don't show tasks to clients
  if (userRole === 'CLIENT') {
    return (
      <Box sx={{ mt: 2, textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Task information is not available to clients
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your legal team manages tasks internally to handle your case efficiently
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={handleOpenCreate}>Add Task</Button>
      </Box>
      {tasks.length === 0 ? <Typography>No tasks found for this case.</Typography> : (
        <TableContainer component={Paper}><Table size="small"><TableHead><TableRow><TableCell>Title</TableCell><TableCell>Assigned To</TableCell><TableCell>Status</TableCell><TableCell>Deadline</TableCell></TableRow></TableHead><TableBody>{tasks.map((task) => (<TableRow key={task.id} hover><TableCell>{task.title}</TableCell><TableCell>{task.assignedTo?.name || 'N/A'}</TableCell><TableCell>{task.status}</TableCell><TableCell>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</TableCell></TableRow>))}</TableBody></Table></TableContainer>
      )}

      {/* Create Task Modal */}
      <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm">
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              name="title"
              label="Task Title"
              type="text"
              fullWidth
              variant="outlined"
              value={form.title}
              onChange={handleChange}
              required
            />
            <Autocomplete
              options={users}
              getOptionLabel={(option) => `${option.name} (${option.role}) - ${option.email}`}
              value={selectedUser}
              onChange={(event, newValue) => setSelectedUser(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign To"
                  required
                  helperText="Search and select a staff member"
                />
              )}
              fullWidth
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={form.description}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              name="deadline"
              label="Deadline"
              type="date"
              fullWidth
              variant="outlined"
              value={form.deadline}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DocumentsView({ caseId }: { caseId: string }) {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      setError(''); setLoading(true);
      const response = await api.get(`/cases/${caseId}/documents`);
      setDocuments(response.data);
    } catch (err) { setError('Failed to fetch documents.'); } finally { setLoading(false); }
  };

  useEffect(() => { if (caseId) { fetchDocuments(); } }, [caseId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{mt: 2}}>{error}</Alert>;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <DocumentUploader caseId={caseId} onUploadSuccess={fetchDocuments} />
      </Box>
      {documents.length === 0 ? <Typography>No documents found for this case.</Typography> : (
        <TableContainer component={Paper}><Table size="small"><TableHead><TableRow><TableCell>File Name</TableCell><TableCell>Uploaded By</TableCell><TableCell>Date Uploaded</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{documents.map((doc) => (<TableRow key={doc.id} hover><TableCell>{doc.fileName}</TableCell><TableCell>{doc.uploadedBy?.name || 'N/A'}</TableCell><TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell><TableCell align="right"><IconButton size="small"><DownloadIcon /></IconButton><IconButton size="small"><DeleteIcon /></IconButton></TableCell></TableRow>))}</TableBody></Table></TableContainer>
      )}
    </Box>
  );
}

function CommunicationsView({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [newMessage, setNewMessage] = useState('');
  const [newRequest, setNewRequest] = useState({ title: '', description: '' });
  const [openRequestDialog, setOpenRequestDialog] = useState(false);

  useEffect(() => {
    if (caseId) {
      fetchUserProfile();
      fetchMessages();
      fetchDocumentRequests();
    }
  }, [caseId]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/cases/${caseId}/communications/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages');
    }
  };

  const fetchDocumentRequests = async () => {
    try {
      const response = await api.get(`/cases/${caseId}/communications/document-requests`);
      setDocumentRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch document requests');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.post(`/cases/${caseId}/communications/messages`, { content: newMessage });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message');
    }
  };

  const createDocumentRequest = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) return;
    try {
      await api.post(`/cases/${caseId}/communications/document-requests`, newRequest);
      setNewRequest({ title: '', description: '' });
      setOpenRequestDialog(false);
      fetchDocumentRequests();
    } catch (error) {
      console.error('Failed to create document request');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Messages</Typography>
            </Box>
            <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
              {messages.map((message) => (
                <Box key={message.id} sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">{message.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {message.sender.name} ({message.sender.role}) - {new Date(message.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} variant="contained" size="small">
                Send
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Document Requests</Typography>
              {userRole !== 'CLIENT' && (
                <Button size="small" onClick={() => setOpenRequestDialog(true)}>
                  Request Document
                </Button>
              )}
            </Box>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {documentRequests.map((request) => (
                <Box key={request.id} sx={{ mb: 2, p: 1, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="subtitle2">{request.title}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>{request.description}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Requested by: {request.requestedBy.name} - Status: {request.status}
                  </Typography>
                  {request.response && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                      Response: {request.response}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={openRequestDialog} onClose={() => setOpenRequestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Document</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Document Title"
            value={newRequest.title}
            onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={newRequest.description}
            onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRequestDialog(false)}>Cancel</Button>
          <Button onClick={createDocumentRequest} variant="contained">Request</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => { setActiveTab(newValue); };
  useEffect(() => {
    if (!caseId) return;
    const fetchCaseDetail = async () => {
      try {
        setError(''); setLoading(true);
        console.log('Fetching case details for caseId:', caseId);
        
        // First, test backend connectivity
        try {
          const profileResponse = await api.get('/auth/profile');
          console.log('Backend is reachable, user profile:', profileResponse.data);
        } catch (healthErr: any) {
          console.error('Backend health check failed:', healthErr);
          if (!healthErr.response) {
            throw new Error('Backend server is not running or not reachable');
          }
          if (healthErr.response?.status === 401) {
            throw new Error('User is not authenticated');
          }
        }
        
        const response = await api.get(`/cases/${caseId}`);
        console.log('Case details response:', response.data);
        setCaseDetail(response.data);
      } catch (err: any) { 
        console.error('Error fetching case details:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        
        let errorMessage = 'Failed to fetch case details.';
        if (err.message === 'Backend server is not running or not reachable') {
          errorMessage = 'Backend server is not running. Please start the backend server on port 3000.';
        } else if (err.message === 'User is not authenticated') {
          errorMessage = 'You are not logged in. Please log in again.';
          // Redirect to login page
          window.location.href = '/login';
          return;
        } else if (err.response?.status === 401) {
          errorMessage = 'You are not authorized to view this case. Please log in again.';
          window.location.href = '/login';
          return;
        } else if (err.response?.status === 404) {
          errorMessage = 'Case not found or you do not have access to it.';
        } else if (err.response?.status === 403) {
          errorMessage = 'You do not have permission to view this case.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.code === 'NETWORK_ERROR' || !err.response) {
          errorMessage = 'Network error. Please check if the backend server is running on port 3000.';
        }
        
        setError(errorMessage); 
      } finally { setLoading(false); }
    };
    fetchCaseDetail();
  }, [caseId]);
  if (loading) return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{ mt: 2 }}>{error}<br/><small>Case ID: {caseId}</small></Alert></Container>;
  if (!caseDetail) return <Container><Alert severity="info">Case not found.</Alert></Container>;
  return (
    <Container>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>{caseDetail.caseName}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>Case Number: {caseDetail.caseNumber || 'N/A'}</Typography>
        <Divider sx={{ my: 2 }} />
        <TimeTrackingWidget caseId={caseId} />
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}><Tab label="Details" /><Tab label="Tasks" /><Tab label="Documents" /><Tab label="Communications" /></Tabs>
        </Box>
        {activeTab === 0 && <CaseDetailsView caseDetail={caseDetail} />}
        {activeTab === 1 && <TasksView caseId={caseId} />}
        {activeTab === 2 && <DocumentsView caseId={caseId} />}
        {activeTab === 3 && <CommunicationsView caseId={caseId} />}
      </Paper>
    </Container>
  );
}